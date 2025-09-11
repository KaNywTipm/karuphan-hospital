"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// ---------- Types ----------
type RowStatus = "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
type Row = {
    id: number;
    status: RowStatus;
    borrowerName?: string | null;
    department?: string | null;
    borrowerType?: "INTERNAL" | "EXTERNAL" | null; // เผื่อมีส่งมาในอนาคต
    equipmentCode?: string | null;
    equipmentName?: string | null;
    borrowDate?: string | null;
    returnDue?: string | null;
    actualReturnDate?: string | null;
    reason?: string | null;
    returnNotes?: string | null;
    receivedBy?: string | null;         // ถ้ามีใน API
    returnCondition?: string | null;    // ถ้ามีใน API
    adminName?: string | null;          // ชื่อแอดมินผู้รับคืน
};

// ---------- Helpers ----------
const toThaiStatus = (s: RowStatus) =>
    s === "PENDING" ? "รออนุมัติ" :
        s === "APPROVED" ? "อนุมัติแล้ว/รอคืน" :
            s === "RETURNED" ? "คืนแล้ว" :
                s === "REJECTED" ? "ไม่อนุมัติ" :
                    "เกินกำหนด";

function getActionButtonStyleByStatus(status: RowStatus) {
    switch (status) {
        case "PENDING":
            return "bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm cursor-pointer";
        case "APPROVED":
            return "bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm cursor-pointer";
        case "REJECTED":
            return "bg-red-500 text-white px-3 py-1 rounded text-sm cursor-not-allowed";
        case "RETURNED":
        default:
            return "bg-gray-500 text-white px-3 py-1 rounded text-sm cursor-not-allowed";
    }
}
function getActionButtonTextByStatus(status: RowStatus) {
    switch (status) {
        case "PENDING": return "อนุมัติ";
        case "APPROVED": return "คืน";
        case "REJECTED": return "ไม่อนุมัติ";
        case "RETURNED": return "คืนแล้ว";
        default: return "ไม่พร้อมดำเนินการ";
    }
}

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("รออนุมัติ");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    // ---------- Fetch + Poll ----------
    async function fetchData(signal?: AbortSignal) {
        try {
            setLoading(true);
            const res = await fetch("/api/borrow", { cache: "no-store", signal });
            const json = await res.json();
            const raw = Array.isArray(json?.data) ? json.data : [];
            const shaped = raw.map((r: any) => ({
                id: r.id,
                status: r.status,
                borrowerType: r.borrowerType,
                // กรณี INTERNAL ใช้ requester.fullName, กรณี EXTERNAL ใช้ externalName
                borrowerName:
                    r.borrowerType === "INTERNAL"
                        ? (r.requester?.fullName ?? "-")
                        : (r.externalName || r.requester?.fullName || "-")
                ,
                // ชื่อแอดมินผู้รับคืน (คืนแล้ว/อนุมัติแล้ว) หรือ rejectedBy (ไม่อนุมัติ/ยกเลิก)
                adminName:
                    r.status === "REJECTED"
                        ? (r.rejectedBy?.fullName ?? "-")
                        : (r.receivedBy?.fullName ?? r.approvedBy?.fullName ?? "-"),
                department:
                    r.borrowerType === "INTERNAL"
                        ? (r.requester?.department?.name ?? "-")
                        : (r.externalDept ?? "ภายนอกกลุ่มงาน")
                ,
                equipmentCode: (r.items ?? []).map((it: any) => it?.equipment?.code).filter(Boolean).join(", "),
                equipmentName: (r.items ?? []).map((it: any) => it?.equipment?.name).filter(Boolean).join(", "),
                borrowDate: r.borrowDate ?? null,
                returnDue: r.returnDue ?? null,
                actualReturnDate: r.actualReturnDate ?? null,
                reason: r.reason ?? null,
                returnNotes: r.returnNotes ?? null,
                // กรณี INTERNAL ใช้ requester.fullName, กรณี EXTERNAL ใช้ externalName เช่นกัน (ถ้าต้องการโชว์ผู้ยืมในคอลัมน์อื่น)
                receivedBy: r.receivedBy?.fullName ?? null,
                returnCondition: r.returnCondition ?? null,
            }));
            setRows(shaped);
        } catch {
            setRows([]); // กันล่ม
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const ctrl = new AbortController();
        fetchData(ctrl.signal);
        const itv = setInterval(() => fetchData(ctrl.signal), 5000);
        return () => {
            ctrl.abort();
            clearInterval(itv);
        };
    }, []);

    // ---------- Derived (filter/sort) ----------
    const filteredData = useMemo(() => {
        const list = Array.isArray(rows) ? rows : [];
        const q = (searchTerm || "").toLowerCase();

        // แปลง tab ไทย -> อังกฤษ
        const tabMap: Record<string, RowStatus | null> = {
            "รออนุมัติ": "PENDING",
            "อนุมัติแล้ว/รอคืน": "APPROVED",
            "คืนแล้ว": "RETURNED",
            "ไม่อนุมัติ/ยกเลิก": "REJECTED",
            "ทั้งหมด": null,
        };
        const statusFilter = tabMap[activeTab] ?? null;

        return list
            .filter((item) => (statusFilter ? item.status === statusFilter : true))
            .filter((item) =>
                (item.borrowerName || "").toLowerCase().includes(q) ||
                (item.equipmentCode || "").toLowerCase().includes(q) ||
                (item.equipmentName || "").toLowerCase().includes(q) ||
                (item.department || "").toLowerCase().includes(q)
            )
            .sort((a, b) => {
                const aDate = new Date(a.borrowDate || a.returnDue || "").getTime();
                const bDate = new Date(b.borrowDate || b.returnDue || "").getTime();
                return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
            });
    }, [rows, searchTerm, activeTab, sortOrder]);

    // นับจำนวนตามแท็บ
    const counts = useMemo(() => {
        const c = { PENDING: 0, APPROVED: 0, RETURNED: 0, REJECTED: 0, ALL: rows.length };
        for (const r of rows) {
            if (r.status === "PENDING") c.PENDING++;
            else if (r.status === "APPROVED") c.APPROVED++;
            else if (r.status === "RETURNED") c.RETURNED++;
            else if (r.status === "REJECTED") c.REJECTED++;
        }
        return c;
    }, [rows]);

    const tabs = [
        { name: "รออนุมัติ", color: "bg-blue-400 text-white", count: counts.PENDING },
        { name: "อนุมัติแล้ว/รอคืน", color: "bg-yellow-400 text-white", count: counts.APPROVED },
        { name: "คืนแล้ว", color: "bg-green-500 text-white", count: counts.RETURNED },
        { name: "ไม่อนุมัติ/ยกเลิก", color: "bg-red-500 text-white", count: counts.REJECTED },
    ];

    // ---------- Actions ----------
    const handleStatusChange = (id: number, status: RowStatus) => {
        if (status === "APPROVED") {
            router.push(`/role1-admin/return?id=${id}`);
        } else if (status === "PENDING") {
            router.push(`/role1-admin/approve?id=${id}`);
        } else {
            // สถานะอื่นไม่ทำอะไร
        }
    };

    // ---------- UI ----------
    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">รายการยืม-คืน</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.name ? tab.color : "bg-gray-200 text--600 hover:bg-gray-300"
                                }`}
                        >
                            {tab.name} ({tab.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Search + Sort */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">{activeTab}</h2>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <Image
                                    src="/search.png"
                                    alt="search"
                                    width={20}
                                    height={20}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                            </div>
                            <button
                                onClick={() => setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                                title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                            >
                                <Image src="/HamBmenu.png" alt="sort" width={20} height={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-red-400 text-white">
                            <tr>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ลำดับ</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ผู้ยืม</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">บุคลากร</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">เลขครุภัณฑ์</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">วันที่ยืม</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">กำหนดคืน</th>

                                {activeTab === "อนุมัติแล้ว/รอคืน" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ผู้รับคืน</th>
                                )}
                                {activeTab === "คืนแล้ว" && (
                                    <>
                                        <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ผู้รับคืน</th>
                                        <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">สภาพ</th>
                                    </>
                                )}
                                {activeTab === "ไม่อนุมัติ/ยกเลิก" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ผู้รับคืน</th>
                                )}

                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">เหตุผลที่ยืม</th>

                                {activeTab === "รออนุมัติ" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">การอนุมัติ</th>
                                )}
                                {activeTab === "อนุมัติแล้ว/รอคืน" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">การคืน</th>
                                )}
                                {activeTab === "คืนแล้ว" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">วันที่คืน</th>
                                )}
                                {activeTab === "ไม่อนุมัติ/ยกเลิก" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">เหตุผลไม่อนุมัติ</th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={12} className="p-4 text-center">กำลังโหลด...</td>
                                </tr>
                            )}

                            {!loading && filteredData.map((item, index) => {
                                const rowNo = index + 1;
                                const personnel =
                                    item.borrowerType === "INTERNAL"
                                        ? "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม"
                                        : item.department || "ภายนอกกลุ่มงาน";

                                const returnDue = item.returnDue
                                    ? new Date(item.returnDue).toLocaleDateString("th-TH")
                                    : "-";
                                const returnedAt = item.actualReturnDate
                                    ? new Date(item.actualReturnDate).toLocaleDateString("th-TH")
                                    : returnDue;

                                const thaiStatus = toThaiStatus(item.status);

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-3 text-center">{rowNo}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.borrowerName || "-"}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{personnel}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.equipmentCode ?? "-"}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.equipmentName || "-"}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.borrowDate ? new Date(item.borrowDate).toLocaleDateString("th-TH") : "-"}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{returnDue}</td>

                                        {activeTab === "อนุมัติแล้ว/รอคืน" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.adminName}</td>
                                        )}
                                        {activeTab === "คืนแล้ว" && (
                                            <>
                                                <td className="border border-gray-300 px-4 py-3 text-center">{item.adminName}</td>
                                                <td className="border border-gray-300 px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${!item.returnCondition || item.returnCondition === "NORMAL" ? "bg-green-100 text-green-800" :
                                                        item.returnCondition === "BROKEN" ? "bg-red-100 text-red-800" :
                                                            item.returnCondition === "LOST" ? "bg-gray-100 text-gray-800" :
                                                                item.returnCondition === "WAIT_DISPOSE" ? "bg-yellow-100 text-yellow-800" :
                                                                    item.returnCondition === "DISPOSED" ? "bg-purple-100 text-purple-800" :
                                                                        "bg-gray-100 text-gray-800"
                                                        }`}>
                                                        {!item.returnCondition || item.returnCondition === "NORMAL"
                                                            ? "ปกติ"
                                                            : item.returnCondition === "BROKEN" ? "ชำรุด"
                                                                : item.returnCondition === "LOST" ? "สูญหาย"
                                                                    : item.returnCondition === "WAIT_DISPOSE" ? "รอจำหน่าย"
                                                                        : item.returnCondition === "DISPOSED" ? "จำหน่ายแล้ว"
                                                                            : "ปกติ"}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        {activeTab === "ไม่อนุมัติ/ยกเลิก" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.adminName}</td>
                                        )}

                                        {/* เหตุผลที่ยืม */}
                                        {activeTab === "คืนแล้ว" ? (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.returnNotes || "-"}</td>
                                        ) : (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.reason || "-"}</td>
                                        )}

                                        {activeTab === "รออนุมัติ" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">
                                                <button
                                                    className={getActionButtonStyleByStatus(item.status)}
                                                    onClick={() => handleStatusChange(item.id, item.status)}
                                                    disabled={item.status !== "PENDING"}
                                                >
                                                    {getActionButtonTextByStatus(item.status)}
                                                </button>
                                            </td>
                                        )}

                                        {activeTab === "อนุมัติแล้ว/รอคืน" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">
                                                <button
                                                    className={getActionButtonStyleByStatus(item.status)}
                                                    onClick={() => handleStatusChange(item.id, item.status)}
                                                    disabled={item.status !== "APPROVED"}
                                                >
                                                    {getActionButtonTextByStatus(item.status)}
                                                </button>
                                            </td>
                                        )}

                                        {activeTab === "คืนแล้ว" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{returnedAt}</td>
                                        )}

                                        {activeTab === "ไม่อนุมัติ/ยกเลิก" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center text-red-600">ไม่อนุมัติ</td>
                                        )}
                                    </tr>
                                );
                            })}

                            {!loading && filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="p-4 text-center text-gray-500">ไม่พบข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination (ยังเป็น mock ปุ่มให้ดีไซน์คงเดิม) */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                            แสดง {filteredData.length} รายการ ({activeTab}) จากทั้งหมด {rows.length} รายการ
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700" disabled={currentPage === 1}>
                            ← Previous
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                            {currentPage}
                        </button>
                        <button className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900" disabled={filteredData.length < 10}>
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

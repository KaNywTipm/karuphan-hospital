
"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
export const dynamic = "force-dynamic";

// ---------- Types ----------
type RowStatus = "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";
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
                "ไม่อนุมัติ";


// สำหรับแปลสภาพ (returnCondition) เฉพาะในหน้าคืนแล้ว
function returnConditionLabelTH(s?: string | null) {
    switch (s) {
        case "NORMAL": return "ปกติ";
        case "BROKEN": return "ชำรุด";
        case "LOST": return "สูญหาย";
        case "WAIT_DISPOSE": return "รอจำหน่าย";
        case "DISPOSED": return "จำหน่ายแล้ว";
        default: return s || "-";
    }
}
function returnConditionColor(s?: string | null) {
    switch (s) {
        case "NORMAL": return "bg-green-100 text-green-800";
        case "BROKEN": return "bg-red-100 text-red-800";
        case "LOST": return "bg-gray-100 text-gray-800";
        case "WAIT_DISPOSE": return "bg-yellow-100 text-yellow-800";
        case "DISPOSED": return "bg-purple-100 text-purple-800";
        default: return "bg-gray-100 text-gray-800";
    }
}

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

function AdminPageInner() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("รออนุมัติ");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const itemsPerPage = 5;

    // ---------- Fetch + Poll ----------
    async function fetchData(signal?: AbortSignal) {
        try {
            setLoading(true);
            const res = await fetch("/api/borrow?page=1&pageSize=1000", {
                method: "GET",
                cache: "no-store",
                signal,
                headers: { Accept: "application/json" }
            });
            const json = await res.json();
            const raw = Array.isArray(json?.data) ? json.data : [];
            const shaped = raw.map((r: any) => {
                // รวมสภาพคืนแต่ละชิ้น (ถ้ามี)
                let returnCondition = null;
                if (r.status === "RETURNED" && Array.isArray(r.items)) {
                    const arr = r.items.map((it: any) => {
                        if (!it?.returnCondition) return { text: "-", condition: "UNKNOWN" };
                        switch (it.returnCondition) {
                            case "NORMAL": return { text: "ปกติ", condition: "NORMAL" };
                            case "BROKEN": return { text: "ชำรุด", condition: "BROKEN" };
                            case "LOST": return { text: "สูญหาย", condition: "LOST" };
                            case "WAIT_DISPOSE": return { text: "รอจำหน่าย", condition: "WAIT_DISPOSE" };
                            case "DISPOSED": return { text: "จำหน่ายแล้ว", condition: "DISPOSED" };
                            default: return { text: it.returnCondition, condition: "UNKNOWN" };
                        }
                    });
                    // เก็บ array ของ conditions เพื่อใช้แสดงผลแบบมีสี
                    returnCondition = arr;
                } else {
                    returnCondition = r.returnCondition ?? null;
                }
                return {
                    id: r.id,
                    status: r.status,
                    borrowerType: r.borrowerType,
                    borrowerName:
                        r.borrowerType === "INTERNAL"
                            ? (r.requester?.fullName ?? "-")
                            : (r.externalName || r.requester?.fullName || "-")
                    ,
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
                    receivedBy: r.receivedBy?.fullName ?? null,
                    returnCondition,
                };
            });
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

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    // Reset to page 1 when changing tabs or search
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

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
                                className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition duration-150 flex items-center justify-center ${sortOrder === "newest" ? "bg-blue-50" : "bg-pink-50"
                                    }`}
                                title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                            >
                                <Image src="/HamBmenu.png" alt="เรียงข้อมูล" width={20} height={20} />
                                <span className="sr-only">เรียงข้อมูล</span>
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
                                {activeTab !== "รออนุมัติ" && (
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">วันที่ยืม</th>
                                )}
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
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">สถานะการยืม</th>
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={12} className="p-4 text-center">กำลังโหลด...</td>
                                </tr>
                            )}

                            {!loading && currentData.map((item, index) => {
                                const rowNo = startIndex + index + 1;
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
                                        {activeTab !== "รออนุมัติ" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.borrowDate ? new Date(item.borrowDate).toLocaleDateString("th-TH") : "-"}</td>
                                        )}
                                        <td className="border border-gray-300 px-4 py-3 text-center">{returnDue}</td>

                                        {activeTab === "อนุมัติแล้ว/รอคืน" && (
                                            <td className="border border-gray-300 px-4 py-3 text-center">{item.adminName}</td>
                                        )}
                                        {activeTab === "คืนแล้ว" && (
                                            <>
                                                <td className="border border-gray-300 px-4 py-3 text-center">{item.adminName}</td>
                                                <td className="border border-gray-300 px-4 py-3 text-center">
                                                    {Array.isArray(item.returnCondition) ? (
                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                            {item.returnCondition.map((cond: any, idx: number) => (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${returnConditionColor(cond.condition)}`}
                                                                >
                                                                    {cond.text}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${returnConditionColor(item.returnCondition)}`}>
                                                            {returnConditionLabelTH(item.returnCondition)}
                                                        </span>
                                                    )}
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

                            {!loading && currentData.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="p-4 text-center text-gray-500">ไม่พบข้อมูล</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                            แสดง {startIndex + 1}-{Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ ({activeTab})
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            className={`px-3 py-1 text-sm ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 cursor-pointer'}`}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            ← Previous
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                            // Show only current page and 2 pages before/after
                            if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded text-sm ${currentPage === pageNum
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                            ) {
                                return <span key={pageNum} className="text-gray-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            className={`px-3 py-1 text-sm ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-gray-900 cursor-pointer'}`}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<div className="p-6">กำลังโหลด...</div>}>
            <AdminPageInner />
        </Suspense>
    );
}
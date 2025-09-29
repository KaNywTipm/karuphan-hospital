"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Status = "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";

// แถวที่ใช้ “หลังรวมเป็นก้อนละ 1 คำขอ”
type Row = {
    requestId: number;
    borrowDate: string | null;
    returnDue: string | null;
    actualReturnDate: string | null;
    status: Status;
    reason: string;
    equipmentCodes: string[]; // รวมหลายชิ้น
    equipmentNames: string[]; // รวมหลายชิ้น
    approverOrReceiver: string;
};

export default function UserHistory() {
    const [rows, setRows] = useState<Row[]>([]);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [page, setPage] = useState(1);
    const perPage = 5;

    // state for expanded rows
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const isExpanded = (id: number) => expanded.has(id);
    const toggle = (id: number) =>
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    // แปลงวันที่ → รูปแบบไทย
    const fmtThaiDate = (d: string | null | undefined) => {
        if (!d) return "-";
        try {
            return new Date(d).toLocaleDateString("th-TH");
        } catch {
            return "-";
        }
    };

    // คำนวณจำนวนวันที่เหลือจนกำหนดคืน
    const getDaysRemaining = (returnDue: string | null, status: Status) => {
        if (!returnDue || status === "RETURNED" || status === "REJECTED") return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueDate = new Date(returnDue);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    // สี/สไตล์สำหรับวันที่เหลือ
    const getDaysRemainingStyle = (daysRemaining: number | null) => {
        if (daysRemaining === null) return "";

        if (daysRemaining < 0) {
            return "text-red-600 font-bold"; // เกินกำหนด
        } else if (daysRemaining === 0) {
            return "text-green-600 font-bold"; // วันนี้กำหนดคืน
        } else if (daysRemaining <= 3) {
            return "text-yellow-600 font-bold"; // เหลือน้อยกว่า 3 วัน
        } else {
            return "text-blue-600"; // ยังมีเวลาเหลือ
        }
    };

    // ข้อความสำหรับวันที่เหลือ
    const getDaysRemainingText = (daysRemaining: number | null) => {
        if (daysRemaining === null) return "";

        if (daysRemaining < 0) {
            return `เกินกำหนด ${Math.abs(daysRemaining)} วัน`;
        } else if (daysRemaining === 0) {
            return "กำหนดคืนวันนี้";
        } else {
            return `เหลือ ${daysRemaining} วัน`;
        }
    };

    // โหลดข้อมูลจาก API (ไม่เอา PENDING ออกมาแสดง)
    useEffect(() => {
        (async () => {
            try {
                // API ฝั่งคุณรองรับทั้งคืนเป็น array ตรง ๆ หรือห่อใน {data:[]}
                const r = await fetch("/api/borrow/history/me?exclude=pending", { cache: "no-store", credentials: "include" });
                const j = await r.json();
                const list: any[] = Array.isArray(j) ? j : (j?.data ?? []);

                // รองรับได้ทั้งกรณี flatten (มี equipmentName/equipmentCode) และกรณีดิบพร้อม items[]
                const flattenLike = (x: any) =>
                    typeof x?.equipmentName !== "undefined" && typeof x?.equipmentCode !== "undefined";

                // 1) map ให้เป็นรายการระดับ “ชิ้น” (flatten ถ้าจำเป็น)
                const perItem: Array<{
                    id: number; // requestId
                    borrowDate: string | null;
                    returnDue: string | null;
                    actualReturnDate: string | null;
                    status: Status;
                    reason: string;
                    code: string;
                    name: string;
                    approverOrReceiver: string;
                }> = [];

                for (const x of list) {
                    const requestId = Number(x.id);
                    const borrowDate = x.borrowDate ?? null;  // วันที่ผู้ใช้เลือก
                    const returnDue = x.returnDue ?? null;
                    const actualReturnDate = x.actualReturnDate ?? null;
                    const status = String(x.status).toUpperCase() as Status;
                    const reason = x.reason ?? x.notes ?? x.rejectReason ?? "";
                    const approverOrReceiver =
                        x.approverOrReceiver ?? x.receivedBy?.fullName ?? x.approvedBy?.fullName ?? "-";

                    if (flattenLike(x)) {
                        perItem.push({
                            id: requestId,
                            borrowDate,
                            returnDue,
                            actualReturnDate,
                            status,
                            reason,
                            code: x.equipmentCode ?? (x.equipmentNumber != null ? String(x.equipmentNumber) : "-"),
                            name: x.equipmentName ?? "-",
                            approverOrReceiver,
                        });
                    } else {
                        const items = Array.isArray(x.items) ? x.items : [];
                        // ไม่มี items → ให้แสดงเป็น “รายการว่าง” 1 แถว (เผื่อกรณีพิเศษ)
                        if (items.length === 0) {
                            perItem.push({
                                id: requestId,
                                borrowDate,
                                returnDue,
                                actualReturnDate,
                                status,
                                reason,
                                code: "-",
                                name: "-",
                                approverOrReceiver,
                            });
                        } else {
                            for (const it of items) {
                                const code =
                                    it?.equipment?.code ??
                                    (it?.equipment?.number != null ? String(it.equipment.number) : "-");
                                const name = it?.equipment?.name ?? "-";
                                perItem.push({
                                    id: requestId,
                                    borrowDate,
                                    returnDue,
                                    actualReturnDate,
                                    status,
                                    reason,
                                    code,
                                    name,
                                    approverOrReceiver,
                                });
                            }
                        }
                    }
                }

                // 2) group ตาม requestId → 1 คำขอ = 1 แถว
                const grouped = new Map<number, Row>();
                for (const it of perItem) {
                    const cur = grouped.get(it.id);
                    if (!cur) {
                        grouped.set(it.id, {
                            requestId: it.id,
                            borrowDate: it.borrowDate,
                            returnDue: it.returnDue,
                            actualReturnDate: it.actualReturnDate,
                            status: it.status,
                            reason: it.reason,
                            equipmentCodes: it.code ? [it.code] : [],
                            equipmentNames: it.name ? [it.name] : [],
                            approverOrReceiver: it.approverOrReceiver,
                        });
                    } else {
                        if (it.code && !cur.equipmentCodes.includes(it.code)) cur.equipmentCodes.push(it.code);
                        if (it.name && !cur.equipmentNames.includes(it.name)) cur.equipmentNames.push(it.name);
                    }
                }

                setRows(Array.from(grouped.values()));
            } catch {
                setRows([]);
            }
        })();
    }, []);

    // สีกับข้อความสถานะ
    const STATUS_BADGE: Record<Status, string> = {
        PENDING: "bg-blue-100 text-blue-800",
        APPROVED: "bg-orange-100 text-orange-800",
        RETURNED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const STATUS_TEXT: Record<Status, string> = {
        PENDING: "รออนุมัติ",
        APPROVED: "อนุมัติแล้ว/รอคืน",
        RETURNED: "คืนแล้ว",
        REJECTED: "ไม่อนุมัติ",
    };

    // filter + sort + paginate
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows
            .filter((r) => {
                // กรองตามสถานะ
                if (statusFilter !== "ALL" && r.status !== statusFilter) {
                    return false;
                }

                // กรองตามข้อความค้นหา
                const text =
                    [
                        r.requestId,
                        fmtThaiDate(r.borrowDate),
                        fmtThaiDate(r.returnDue),
                        r.equipmentCodes.join(", "),
                        r.equipmentNames.join(", "),
                        STATUS_TEXT[r.status],
                        r.reason ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();
                return text.includes(q);
            })
            .sort((a, b) => {
                const aT = new Date(a.borrowDate ?? 0).getTime();
                const bT = new Date(b.borrowDate ?? 0).getTime();
                return sort === "newest" ? bT - aT : aT - bT;
            });
    }, [STATUS_TEXT, rows, search, sort, statusFilter]);

    // สรุปจำนวนตามสถานะ
    const statusCounts = useMemo(() => {
        const counts = {
            PENDING: 0,
            APPROVED: 0,
            RETURNED: 0,
            REJECTED: 0
        };

        filtered.forEach(row => {
            counts[row.status]++;
        });

        return counts;
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const start = (page - 1) * perPage;
    const current = filtered.slice(start, start + perPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        ประวัติการยืมครุภัณฑ์ (ไม่นับรายการที่ยังรออนุมัติ)
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาเลข/ชื่อครุภัณฑ์"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image
                                src="/icons/search.png"
                                alt="search"
                                width={20}
                                height={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70"
                            />
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as "ALL" | Status);
                                    setPage(1);
                                }}
                                className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                            >
                                <option value="ALL">ทุกสถานะ</option>
                                <option value="APPROVED">อนุมัติแล้ว/รอคืน</option>
                                <option value="RETURNED">คืนแล้ว</option>
                                <option value="REJECTED">ไม่อนุมัติ</option>
                            </select>
                        </div>

                        <button
                            onClick={() => setSort((p) => (p === "newest" ? "oldest" : "newest"))}
                            className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition duration-150 flex items-center justify-center ${sort === "newest" ? "bg-blue-50" : "bg-pink-50"
                                }`}
                            title={sort === "newest" ? "เรียงจากใหม่ → เก่า" : "เรียงจากเก่า → ใหม่"}
                        >
                            <Image src="/icons/HamBmenu.png" alt="เรียงข้อมูล" width={20} height={20} />
                            <span className="sr-only">เรียงข้อมูล</span>
                        </button>
                    </div>
                </div>

                {/* Summary Status Labels */}
                <div className="px-4 py-3 bg-gray-50 border-b">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-sm font-medium text-gray-700">สรุปรายการ:</span>

                        {statusFilter === "ALL" && (
                            <>
                                {statusCounts.APPROVED > 0 && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                        <span className="text-sm text-gray-600">
                                            อนุมัติแล้ว/รอคืน ({statusCounts.APPROVED})
                                        </span>
                                    </div>
                                )}

                                {statusCounts.RETURNED > 0 && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-sm text-gray-600">
                                            คืนแล้ว ({statusCounts.RETURNED})
                                        </span>
                                    </div>
                                )}

                                {statusCounts.REJECTED > 0 && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-sm text-gray-600">
                                            ไม่อนุมัติ ({statusCounts.REJECTED})
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {statusFilter === "APPROVED" && (
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span className="text-sm text-orange-600 font-medium">
                                    กำลังแสดงรายการที่ต้องคืน ({filtered.length} รายการ)
                                </span>
                            </div>
                        )}

                        {statusFilter === "RETURNED" && (
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-green-600 font-medium">
                                    กำลังแสดงรายการที่คืนแล้ว ({filtered.length} รายการ)
                                </span>
                            </div>
                        )}

                        {statusFilter === "REJECTED" && (
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm text-red-600 font-medium">
                                    กำลังแสดงรายการที่ไม่อนุมัติ ({filtered.length} รายการ)
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                            <span className="text-sm font-medium text-gray-700">
                                {statusFilter === "ALL" ? `รวมทั้งหมด: ${filtered.length} รายการ` : `แสดง: ${filtered.length} รายการ`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead className="bg-Pink text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium w-1/12">ลำดับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">วันที่ยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">กำหนดคืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">เลขครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-2/12">เหตุผล/บันทึก</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {current.map((r, idx) => {
                                const daysRemaining = getDaysRemaining(r.returnDue, r.status);
                                return (
                                    <tr key={r.requestId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">{start + idx + 1}</td>
                                        <td className="px-4 py-3 text-sm">{fmtThaiDate(r.borrowDate)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div>
                                                <div>{fmtThaiDate(r.returnDue)}</div>
                                                {daysRemaining !== null && (
                                                    <div className={`text-xs mt-1 ${getDaysRemainingStyle(daysRemaining)}`}>
                                                        {getDaysRemainingText(daysRemaining)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm align-top max-w-[36rem] whitespace-normal break-words leading-6">
                                            {r.equipmentCodes.join(", ")}
                                        </td>
                                        <td className="px-4 py-3 align-top max-w-[36rem]">
                                            <div className={`whitespace-normal break-words leading-6 ${isExpanded(r.requestId) ? "" : "line-clamp-2"}`}>
                                                {r.equipmentNames.join(", ")}
                                            </div>
                                            {r.equipmentNames.join(", ").length > 50 && (
                                                <button
                                                    onClick={() => toggle(r.requestId)}
                                                    className="mt-1 text-xs text-blue-600 hover:underline">
                                                    {isExpanded(r.requestId) ? "ย่อ" : "ดูทั้งหมด"}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]
                                                    }`}
                                            >
                                                {r.status === "APPROVED" && !r.actualReturnDate ? "อนุมัติแล้ว/รอคืน" :
                                                    r.status === "RETURNED" ? "คืนแล้ว" :
                                                        r.status === "REJECTED" ? "ไม่อนุมัติ" : "รออนุมัติ"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {r.status === "REJECTED" && r.reason ? (
                                                <div>
                                                    <span className="text-red-600 font-medium">เหตุผลไม่อนุมัติ: </span>
                                                    <span>{r.reason}</span>
                                                </div>
                                            ) : (
                                                r.reason || "-"
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!current.length && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ยังไม่มีรายการ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* paging */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-gray-700">
                        แสดง {filtered.length === 0 ? 0 : start + 1} – {Math.min(start + perPage, filtered.length)} จาก {filtered.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            disabled={page === 1}
                        >
                            ← Previous
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                            {page}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                            disabled={page === totalPages || totalPages === 0}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

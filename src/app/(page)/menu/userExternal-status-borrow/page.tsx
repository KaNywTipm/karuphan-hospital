"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

/* ---------- types + helpers ---------- */
type BorrowItem = { equipment?: { number?: number; name?: string } };
type BorrowRequest = {
    id: number;
    status: string;                 // PENDING | APPROVED | REJECTED | RETURNED | ...
    requestedAt?: string;           // ใช้เป็น “วันที่ยืม”
    createdAt?: string;
    requestDate?: string;
    returnDue?: string | null;
    actualReturnDate?: string | null;
    reason?: string;
    notes?: string;
    items?: BorrowItem[];
};

const asList = <T,>(v: any): T[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);
const lc = (v: any) => String(v ?? "").toLowerCase();

const toThaiStatus = (s: string) => {
    const t = String(s).toUpperCase();
    if (t === "PENDING") return "รออนุมัติ";
    if (t === "APPROVED") return "อนุมัติแล้ว/รอคืน";
    if (t === "REJECTED") return "ไม่อนุมัติ";
    if (t === "RETURNED") return "คืนแล้ว";
    if (t === "OVERDUE") return "เกินกำหนด";
    return s || "-";
};

const statusBadgeClass = (s: string) => {
    const t = String(s).toUpperCase();
    if (t === "PENDING") return "bg-blue-100 text-blue-800";
    if (t === "APPROVED") return "bg-orange-100 text-orange-800";
    if (t === "RETURNED") return "bg-green-100 text-green-800";
    if (t === "REJECTED") return "bg-red-100 text-red-800";
    if (t === "OVERDUE") return "bg-fuchsia-100 text-fuchsia-800";
    return "bg-gray-100 text-gray-800";
};

// yyyy-mm-dd/iso -> วัน/เดือน/ปี(พ.ศ.)
const fmtThaiDate = (d?: string | null) => {
    if (!d) return "-";
    const m = d.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const year = Number(m[1]) + 543;
        const month = Number(m[2]);
        const day = Number(m[3]);
        return `${day}/${month}/${year}`;
    }
    return new Date(d).toLocaleDateString("th-TH");
};

/* ---------- page ---------- */
export default function UserExternalStatusBorrow() {
    const [all, setAll] = useState<BorrowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    async function load() {
        setLoading(true);
        try {
            // ดึงเฉพาะรายการ "รออนุมัติ"
            const res = await fetch("/api/borrow/history/me?only=pending", {
                credentials: "include",
                cache: "no-store",
            });
            const json = await res.json();
            const data = asList<BorrowRequest>(json);
            setAll(data);
        } catch (e) {
            setAll([]);
            console.error("[userExternal-status-borrow] fetch error", e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    // แปลงให้ “1 อุปกรณ์ = 1 แถว”
    type Row = {
        id: number;
        borrowDate: string | null;        // วันที่ส่งคำขอ = วันที่ยืม
        returnDue: string | null;
        equipmentName: string;
        equipmentCode: string;
        status: string;
        reason: string;
    };

    const flatRows: Row[] = useMemo(() => {
        if (!all.length) return [];
        // เรียงตาม “วันที่ยืม”
        const sorted = [...all].sort((a, b) => {
            const da = new Date(a.requestedAt || a.createdAt || a.requestDate || 0).getTime();
            const db = new Date(b.requestedAt || b.createdAt || b.requestDate || 0).getTime();
            return db - da;
        });

        const rows: Row[] = [];
        for (const req of sorted) {
            const borrowDate = req.requestedAt || req.createdAt || req.requestDate || null;
            const returnDue = req.returnDue ?? null;
            const reason = req.reason ?? req.notes ?? "";
            const items = req.items ?? [];
            if (!items.length) {
                rows.push({
                    id: req.id,
                    borrowDate,
                    returnDue,
                    equipmentName: "-",
                    equipmentCode: "-",
                    status: req.status,
                    reason,
                });
            } else {
                for (const it of items) {
                    rows.push({
                        id: req.id,
                        borrowDate,
                        returnDue,
                        equipmentName: it.equipment?.name ?? "-",
                        equipmentCode:
                            it.equipment?.number !== undefined && it.equipment?.number !== null
                                ? String(it.equipment.number)
                                : "-",
                        status: req.status,
                        reason,
                    });
                }
            }
        }
        return rows;
    }, [all]);

    // ค้นหา + เรียง โดยใช้ “วันที่ยืม”
    const filteredData = useMemo(() => {
        const s = lc(searchTerm);
        return flatRows
            .filter(
                (r) =>
                    lc(r.equipmentName).includes(s) ||
                    lc(r.equipmentCode).includes(s) ||
                    lc(r.reason).includes(s) ||
                    lc(r.status).includes(s)
            )
            .sort((a, b) => {
                const da = new Date(a.borrowDate ?? 0).getTime();
                const db = new Date(b.borrowDate ?? 0).getTime();
                return sortOrder === "newest" ? db - da : da - db;
            });
    }, [flatRows, searchTerm, sortOrder]);

    // แบ่งหน้า
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        สถานะการยืมครุภัณฑ์ (รายการรออนุมัติ)
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาครุภัณฑ์ / เลขครุภัณฑ์ / เหตุผล"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image
                                src="/search.png"
                                alt="search"
                                width={20}
                                height={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2"
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

                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        <thead className="bg-Pink text-White">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[80px]">ลำดับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[110px]">วันที่ยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[110px]">กำหนดคืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">เลขครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[250px]">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[130px]">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">เหตุผลที่ยืม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        กำลังโหลดข้อมูล…
                                    </td>
                                </tr>
                            )}

                            {!loading && currentData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ยังไม่มีรายการ
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                currentData.map((item, index) => (
                                    <tr key={`${item.id}-${index}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {fmtThaiDate(item.borrowDate)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {fmtThaiDate(item.returnDue)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.equipmentCode}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.equipmentName}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadgeClass(
                                                    item.status
                                                )}`}
                                            >
                                                {toThaiStatus(item.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.reason || "-"}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-sm text-gray-700">
                            แสดง {filteredData.length === 0 ? 0 : startIndex + 1} –{" "}
                            {Math.min(startIndex + itemsPerPage, filteredData.length)} จาก{" "}
                            {filteredData.length} รายการ
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            >
                                ← Previous
                            </button>
                            <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                                {currentPage}
                            </span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

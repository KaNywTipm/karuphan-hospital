"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Row = {
    requestId: number;
    borrowDate: string | null;
    returnDue: string;
    actualReturnDate: string | null;
    status: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
    reason: string;
    equipmentName: string;
    equipmentCode: string;
};

export default function UserHistory() {
    const [rows, setRows] = useState<Row[]>([]);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [page, setPage] = useState(1);
    const perPage = 5;

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/borrow/history/me", { cache: "no-store" }).then(r => r.json());
            if (res.ok) setRows(res.items);
        })();
    }, []);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        const byFind = rows.filter(r =>
            r.equipmentName.toLowerCase().includes(s) ||
            r.equipmentCode.toLowerCase().includes(s) ||
            r.reason.toLowerCase().includes(s) ||
            r.status.toLowerCase().includes(s)
        );
        const bySort = byFind.sort((a, b) => {
            const ad = new Date(a.borrowDate ?? a.returnDue).getTime();
            const bd = new Date(b.borrowDate ?? b.returnDue).getTime();
            return sort === "newest" ? bd - ad : ad - bd;
        });
        return bySort;
    }, [rows, search, sort]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const startIndex = (page - 1) * perPage;
    const pageRows = filtered.slice(startIndex, startIndex + perPage);

    const statusBadge = (st: Row["status"]) => {
        const map: Record<Row["status"], string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            APPROVED: "bg-orange-100 text-orange-800",
            RETURNED: "bg-green-100 text-green-800",
            REJECTED: "bg-red-100 text-red-800",
            OVERDUE: "bg-purple-100 text-purple-800",
        };
        return map[st];
    };
    const statusText = (st: Row["status"]) =>
        ({ PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว/รอคืน", RETURNED: "คืนแล้ว", REJECTED: "ไม่อนุมัติ", OVERDUE: "เกินกำหนด" } as const)[st];

    const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("th-TH") : "-";

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">ประวัติการยืมครุภัณฑ์</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาครุภัณฑ์"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image src="/search.png" alt="search" width={20} height={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        <button
                            onClick={() => setSort((p) => (p === "newest" ? "oldest" : "newest"))}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            title={sort === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
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
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">กำหนดยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">กำหนดคืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">วันที่คืนจริง</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[110px]">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">เหตุผล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pageRows.map((r, i) => (
                                <tr key={`${r.requestId}-${i}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{startIndex + i + 1}</td>
                                    <td className="px-4 py-3 text-sm">{fmt(r.borrowDate)}</td>
                                    <td className="px-4 py-3 text-sm">{fmt(r.returnDue)}</td>
                                    <td className="px-4 py-3 text-sm">{fmt(r.actualReturnDate)}</td>
                                    <td className="px-4 py-3 text-sm">{r.equipmentName}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                                            {statusText(r.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{r.reason || "-"}</td>
                                </tr>
                            ))}

                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">ไม่พบรายการ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-gray-700">
                        แสดง {filtered.length === 0 ? 0 : startIndex + 1} – {Math.min(startIndex + perPage, filtered.length)} จาก {filtered.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button disabled={page === 1} onClick={() => setPage(p => Math.max(p - 1, 1))}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">← Previous</button>
                        <span className="w-8 h-8 grid place-items-center bg-gray-800 text-white rounded text-sm">{page}</span>
                        <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50">Next →</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

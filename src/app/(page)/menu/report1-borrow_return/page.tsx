"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Row = {
    id: number;
    borrowerName?: string | null;
    department?: string | null;
    equipmentCode?: string | null;   // รวมหลายชิ้นแล้วเป็น string เดียว เช่น "A,B,C"
    equipmentName?: string | null;   // เช่น "โน้ตบุ๊ก, จอภาพ"
    borrowDate?: string | null;
    returnDue?: string | null;
    actualReturnDate?: string | null;
    reason?: string | null;
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
    categoryNames?: string | string[] | null; // ถ้า API ยังไม่ส่งมา จะเป็น undefined ก็ได้
};

type Category = { id: number; name: string };

const statusTH = (s?: Row["status"]) =>
    s === "PENDING" ? "รออนุมัติ" :
        s === "APPROVED" ? "อนุมัติแล้ว/รอคืน" :
            s === "RETURNED" ? "คืนแล้ว" :
                s === "REJECTED" ? "ไม่อนุมัติ" :
                    s === "OVERDUE" ? "เกินกำหนด" : "-";

export default function BorrowReturnReport() {
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("");
    const [rows, setRows] = useState<Row[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [bRes, cRes] = await Promise.all([
                    fetch("/api/borrow", { cache: "no-store" }),
                    fetch("/api/categories", { cache: "no-store" }),
                ]);
                const bJson = await bRes.json().catch(() => ({ data: [] }));
                const cJson = await cRes.json().catch(() => ({ data: [] }));
                if (!alive) return;
                setRows(Array.isArray(bJson?.data) ? bJson.data : []);
                setCats(Array.isArray(cJson?.data) ? cJson.data : []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const filtered = useMemo(() => {
        const q = (search || "").toLowerCase();
        return (rows || [])
            .filter(r =>
                (r.borrowerName || "").toLowerCase().includes(q) ||
                (r.department || "").toLowerCase().includes(q) ||
                (r.equipmentCode || "").toLowerCase().includes(q) ||
                (r.equipmentName || "").toLowerCase().includes(q)
            )
            .filter(r => {
                if (!cat) return true;
                const names = Array.isArray(r.categoryNames)
                    ? r.categoryNames
                    : (typeof r.categoryNames === "string" ? r.categoryNames.split(",").map(s => s.trim()) : []);
                return names.some(n => n === cat);
            });
    }, [rows, search, cat]);

    function toDate(s?: string | null) {
        return s ? new Date(s).toLocaleDateString("th-TH") : "-";
    }

    // CSV export (รองรับ UTF-8 BOM)
    const handleExcelExport = () => {
        const headers = [
            "ลำดับ", "ผู้ยืม", "หน่วยงาน", "เลขครุภัณฑ์", "ชื่อครุภัณฑ์", "หมวดหมู่", "วันที่ยืม", "เหตุผลการยืม", "สถานะ", "วันที่คืน"
        ];
        const lines = filtered.map((r, i) => {
            const catText = Array.isArray(r.categoryNames)
                ? r.categoryNames.join(" / ")
                : (r.categoryNames ?? "");
            const returned = r.actualReturnDate || r.returnDue || "";
            return [
                i + 1,
                `"${r.borrowerName ?? "-"}"`,
                `"${r.department ?? "-"}"`,
                r.equipmentCode ?? "",
                `"${r.equipmentName ?? "-"}"`,
                `"${catText}"`,
                r.borrowDate ? toDate(r.borrowDate) : "-",
                `"${r.reason ?? ""}"`,
                `"${statusTH(r.status)}"`,
                returned ? toDate(returned) : "-"
            ].join(",");
        });
        const csv = [headers.join(","), ...lines].join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `รายงานสรุปการยืมคืน_${new Date().toLocaleDateString("th-TH")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-NavyBlue">รายงานสรุปการยืมคืน</h1>
                <button onClick={handleExcelExport} className="bg-Green text-White px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600">
                    <span>ดาวน์โหลด Excel</span>
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-NavyBlue">หมวดหมู่:</label>
                    <select
                        value={cat}
                        onChange={(e) => setCat(e.target.value)}
                        className="px-3 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                    >
                        <option value="">ทั้งหมด</option>
                        {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="relative w-80">
                    <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Image src="/search.png" alt="search" width={20} height={20} className="opacity-50" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-White">
                            <th className="border px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border px-4 py-3 text-center font-medium">ผู้ยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">หน่วยงาน</th>
                            <th className="border px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่ยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">เหตุผลการยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">สถานะ</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่คืน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!loading && filtered.length === 0) && (
                            <tr><td colSpan={9} className="border px-4 py-8 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
                        )}

                        {filtered.map((r, i) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="border px-4 py-3 text-center">{i + 1}</td>
                                <td className="border px-4 py-3 text-center">{r.borrowerName ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.department ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.equipmentCode ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.equipmentName ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{toDate(r.borrowDate)}</td>
                                <td className="border px-4 py-3 text-center">{r.reason ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs ${r.status === "RETURNED" ? "bg-Green text-White" :
                                            r.status === "APPROVED" ? "bg-Yellow text-White" :
                                                r.status === "PENDING" ? "bg-Grey text-White" : "bg-RedLight text-White"
                                        }`}>
                                        {statusTH(r.status)}
                                    </span>
                                </td>
                                <td className="border px-4 py-3 text-center">
                                    {toDate(r.actualReturnDate || r.returnDue)}
                                </td>
                            </tr>
                        ))}

                        {loading && <tr><td colSpan={9} className="border px-4 py-8 text-center">กำลังโหลด...</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-gray-700">
                    แสดง {filtered.length} รายการ จากทั้งหมด {rows.length} รายการ
                </span>
                <div className="flex items-center gap-1">
                    <button className="px-3 py-1 text-sm text-gray-500" disabled>← Previous</button>
                    <button className="w-8 h-8 flex items-center justify-center bg-NavyBlue text-white rounded text-sm">1</button>
                    <button className="px-3 py-1 text-sm text-gray-700" disabled>Next →</button>
                </div>
            </div>
        </div>
    );
}

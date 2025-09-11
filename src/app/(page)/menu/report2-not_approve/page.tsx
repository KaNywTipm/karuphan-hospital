"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Row = {
    id: number;
    borrowerName?: string | null;
    department?: string | null;
    equipmentCode?: string | null;
    equipmentName?: string | null;
    borrowDate?: string | null;
    returnDue?: string | null;
    reason?: string | null;
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
    categoryNames?: string | string[] | null;
    rejectedByName?: string | null;
};
type Category = { id: number; name: string };

export default function NotApproveReport() {
    const [rows, setRows] = useState<Row[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");

    useEffect(() => {
        (async () => {
            const [bRes, cRes] = await Promise.all([
                fetch("/api/borrow", { cache: "no-store" }),
                fetch("/api/categories", { cache: "no-store" }),
            ]);
            const b = await bRes.json().catch(() => ({ data: [] }));
            const c = await cRes.json().catch(() => ({ data: [] }));
            // Map all display fields for table (borrowerName, department, equipmentCode, equipmentName, rejectedByName)
            const borrowRows = Array.isArray(b?.data) ? b.data.map((r: any) => ({
                id: r.id,
                borrowerName:
                    r.borrowerType === "INTERNAL"
                        ? (r.requester?.fullName ?? "-")
                        : (r.externalName || r.requester?.fullName || "-"),
                department:
                    r.borrowerType === "INTERNAL"
                        ? (r.requester?.department?.name ?? "-")
                        : (r.externalDept ?? "ภายนอกกลุ่มงาน"),
                equipmentCode: (r.items ?? []).map((it: any) => it?.equipment?.code).filter(Boolean).join(", "),
                equipmentName: (r.items ?? []).map((it: any) => it?.equipment?.name).filter(Boolean).join(", "),
                borrowDate: r.borrowDate ?? null,
                returnDue: r.returnDue ?? null,
                reason: r.reason ?? null,
                status: r.status,
                categoryNames: r.categoryNames,
                rejectedByName: r.rejectedBy?.fullName ?? "-",
            })) : [];
            setRows(borrowRows);
            setCats(Array.isArray(c?.data) ? c.data : []);
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = (search || "").toLowerCase();
        return (rows || [])
            .filter(r => r.status === "REJECTED")
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
            })
            .sort((a, b) => {
                const da = new Date(a.borrowDate || "").getTime();
                const db = new Date(b.borrowDate || "").getTime();
                return sort === "newest" ? db - da : da - db;
            });
    }, [rows, search, cat, sort]);

    const toDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("th-TH") : "-");

    const handleExcelExport = () => {
        const headers = ["ลำดับ", "ผู้ยืม", "หน่วยงาน", "เลขครุภัณฑ์", "ชื่อครุภัณฑ์", "หมวดหมู่", "วันที่ยืม", "กำหนดคืน", "เหตุผลการยืม", "ผู้ไม่อนุมัติ", "สถานะ"];
        const lines = filtered.map((r, i) => {
            const catText = Array.isArray(r.categoryNames) ? r.categoryNames.join(" / ") : (r.categoryNames ?? "");
            return [
                i + 1,
                `"${r.borrowerName ?? "-"}"`,
                `"${r.department ?? "-"}"`,
                r.equipmentCode ?? "",
                `"${r.equipmentName ?? "-"}"`,
                `"${catText}"`,
                toDate(r.borrowDate),
                toDate(r.returnDue),
                `"${r.reason ?? ""}"`,
                `"${r.rejectedByName ?? "-"}"`,
                `"ไม่อนุมัติ"`,
            ].join(",");
        });
        const csv = [headers.join(","), ...lines].join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `รายงานครุภัณฑ์ที่ถูกยกเลิก_${new Date().toLocaleDateString("th-TH")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-NavyBlue">รายงานครุภัณฑ์ที่ถูกยกเลิก/ไม่อนุมัติ</h1>
                <button onClick={handleExcelExport} className="bg-Green text-White px-4 py-2 rounded-lg hover:bg-green-600">ดาวน์โหลด Excel</button>
            </div>

            <div className="mb-6 flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-NavyBlue">หมวดหมู่:</label>
                    <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2 border border-Grey rounded-lg">
                        <option value="">ทั้งหมด</option>
                        {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-4">
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
                    <button onClick={() => setSort(s => s === "newest" ? "oldest" : "newest")} className="p-2 border border-Grey rounded-lg hover:bg-gray-100">
                        <Image src="/HamBmenu.png" alt="sort" width={20} height={20} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-White">
                            <th className="border px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border px-4 py-3 text-center font-medium">ผู้ยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">บุคลากร</th>
                            <th className="border px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่ยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">กำหนดคืน</th>
                            <th className="border px-4 py-3 text-center font-medium">เหตุผลการยืม</th>
                            <th className="border px-4 py-3 text-center font-medium">ผู้ไม่อนุมัติ</th>
                            <th className="border px-4 py-3 text-center font-medium">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={11} className="border px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลครุภัณฑ์ที่ถูกยกเลิก/ไม่อนุมัติ</td></tr>}
                        {filtered.map((r, i) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="border px-4 py-3 text-center">{i + 1}</td>
                                <td className="border px-4 py-3 text-center">{r.borrowerName ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.department ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.equipmentCode ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.equipmentName ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{toDate(r.borrowDate)}</td>
                                <td className="border px-4 py-3 text-center">{toDate(r.returnDue)}</td>
                                <td className="border px-4 py-3 text-center">{r.reason ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{r.rejectedByName ?? "-"}</td>
                                <td className="border px-4 py-3 text-center"><span className="px-2 py-1 rounded-full text-xs bg-RedLight text-White">ไม่อนุมัติ</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-gray-700">แสดง {filtered.length} รายการ จากทั้งหมด {rows.filter(r => r.status === "REJECTED").length} รายการ</span>
                <div className="flex items-center gap-1">
                    <button className="px-3 py-1 text-sm text-gray-500" disabled>← Previous</button>
                    <button className="w-8 h-8 flex items-center justify-center bg-NavyBlue text-white rounded text-sm">1</button>
                    <button className="px-3 py-1 text-sm text-gray-700" disabled>Next →</button>
                </div>
            </div>
        </div>
    );
}

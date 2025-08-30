"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Row = {
    id: number;
    equipmentCode?: string | null;
    equipmentName?: string | null;
    returnDue?: string | null;
    actualReturnDate?: string | null;
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
    returnCondition?: "NORMAL" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED" | null;
    categoryNames?: string | string[] | null;
};
type Category = { id: number; name: string };

const conditionTH = (c?: Row["returnCondition"]) =>
    c === "NORMAL" ? "ปกติ" :
        c === "BROKEN" ? "ชำรุด" :
            c === "LOST" ? "สูญหาย" :
                c === "WAIT_DISPOSE" ? "รอจำหน่าย" :
                    c === "DISPOSED" ? "จำหน่ายแล้ว" : "ไม่ระบุ";

const badgeCls = (c?: Row["returnCondition"]) =>
    c === "NORMAL" ? "bg-Green text-White" :
        c === "BROKEN" ? "bg-Yellow text-NavyBlue" :
            c === "LOST" ? "bg-RedLight text-White" :
                c === "WAIT_DISPOSE" ? "bg-Grey text-White" :
                    c === "DISPOSED" ? "bg-NavyBlue text-White" : "bg-Grey text-White";

export default function StatusKaruphanReport() {
    const [rows, setRows] = useState<Row[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [cond, setCond] = useState<Row["returnCondition"] | "">("");

    useEffect(() => {
        (async () => {
            const [bRes, cRes] = await Promise.all([
                fetch("/api/borrow", { cache: "no-store" }),
                fetch("/api/categories", { cache: "no-store" }),
            ]);
            const b = await bRes.json().catch(() => ({ data: [] }));
            const c = await cRes.json().catch(() => ({ data: [] }));
            setRows(Array.isArray(b?.data) ? b.data : []);
            setCats(Array.isArray(c?.data) ? c.data : []);
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = (search || "").toLowerCase();
        return (rows || [])
            .filter(r => r.status === "RETURNED" && !!r.returnCondition)
            .filter(r =>
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
            .filter(r => (cond ? r.returnCondition === cond : true))
            .sort((a, b) => {
                const da = new Date(a.actualReturnDate || a.returnDue || "").getTime();
                const db = new Date(b.actualReturnDate || b.returnDue || "").getTime();
                return sort === "newest" ? db - da : da - db;
            });
    }, [rows, search, cat, cond, sort]);

    const toDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("th-TH") : "-");

    const handleExcelExport = () => {
        const headers = ["ลำดับ", "เลขครุภัณฑ์", "ชื่อครุภัณฑ์", "วันที่คืน", "ราคาที่ได้รับ", "สถานะ"];
        const lines = filtered.map((r, i) => {
            const remark =
                r.returnCondition === "LOST" ? "รอดำเนินการ" :
                    r.returnCondition === "BROKEN" ? "ซ่อมแซม" :
                        r.returnCondition === "DISPOSED" ? "จำหน่ายแล้ว" :
                            r.returnCondition === "WAIT_DISPOSE" ? "รอจำหน่าย" : "ใช้งานปกติ";
            return [
                i + 1,
                r.equipmentCode ?? "",
                `"${r.equipmentName ?? "-"}"`,
                toDate(r.actualReturnDate || r.returnDue),
                `"${remark}"`,
                `"${conditionTH(r.returnCondition)}"`,
            ].join(",");
        });
        const csv = [headers.join(","), ...lines].join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `รายงานสรุปสถานะครุภัณฑ์_${new Date().toLocaleDateString("th-TH")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-NavyBlue">รายงานสรุปสถานะของครุภัณฑ์</h1>
                <button onClick={handleExcelExport} className="bg-Green text-White px-4 py-2 rounded-lg hover:bg-green-600">ดาวน์โหลด Excel</button>
            </div>

            <div className="mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-NavyBlue">หมวดหมู่:</label>
                    <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2 border border-Grey rounded-lg">
                        <option value="">ทั้งหมด</option>
                        {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-NavyBlue">สถานะ:</label>
                    <select value={cond || ""} onChange={(e) => setCond((e.target.value || "") as any)} className="px-3 py-2 border border-Grey rounded-lg">
                        <option value="">ทั้งหมด</option>
                        <option value="NORMAL">ปกติ</option>
                        <option value="BROKEN">ชำรุด</option>
                        <option value="LOST">สูญหาย</option>
                        <option value="WAIT_DISPOSE">รอจำหน่าย</option>
                        <option value="DISPOSED">จำหน่ายแล้ว</option>
                    </select>
                </div>

                <div className="relative w-80 ml-auto">
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

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-white">
                            <th className="border px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่คืน</th>
                            <th className="border px-4 py-3 text-center font-medium">ราคาที่ได้รับ</th>
                            <th className="border px-4 py-3 text-center font-medium">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={6} className="border px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลครุภัณฑ์ที่คืนแล้ว</td></tr>}
                        {filtered.map((r, i) => {
                            const remark =
                                r.returnCondition === "LOST" ? "รอดำเนินการ" :
                                    r.returnCondition === "BROKEN" ? "ซ่อมแซม" :
                                        r.returnCondition === "DISPOSED" ? "จำหน่ายแล้ว" :
                                            r.returnCondition === "WAIT_DISPOSE" ? "รอจำหน่าย" : "ใช้งานปกติ";
                            return (
                                <tr key={r.id} className="hover:bg-gray-50">
                                    <td className="border px-4 py-3 text-center">{i + 1}</td>
                                    <td className="border px-4 py-3 text-center">{r.equipmentCode ?? "-"}</td>
                                    <td className="border px-4 py-3 text-center">{r.equipmentName ?? "-"}</td>
                                    <td className="border px-4 py-3 text-center">{toDate(r.actualReturnDate || r.returnDue)}</td>
                                    <td className="border px-4 py-3 text-center">{remark}</td>
                                    <td className="border px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${badgeCls(r.returnCondition)}`}>
                                            {conditionTH(r.returnCondition)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-gray-700">แสดง {filtered.length} รายการ</span>
                <div className="flex items-center gap-1">
                    <button className="px-3 py-1 text-sm text-gray-500" disabled>← Previous</button>
                    <button className="w-8 h-8 flex items-center justify-center bg-NavyBlue text-white rounded text-sm">1</button>
                    <button className="px-3 py-1 text-sm text-gray-700" disabled>Next →</button>
                </div>
            </div>
        </div>
    );
}

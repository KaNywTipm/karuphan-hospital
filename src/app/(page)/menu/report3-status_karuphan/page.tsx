
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface Row {
    number: number;
    code: string;
    idnum?: string | null;
    name: string;
    description?: string | null;
    price?: number | null;
    receivedDate: string;
    status: "NORMAL" | "RESERVED" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    category?: { id: number; name: string } | null;
}
type Category = { id: number; name: string };

const statusLabelTH = (s: Row["status"]) =>
({
    NORMAL: "ปกติ",
    RESERVED: "รออนุมัติ",
    IN_USE: "กำลังใช้งาน",
    BROKEN: "ชำรุด",
    LOST: "สูญหาย",
    WAIT_DISPOSE: "รอจำหน่าย",
    DISPOSED: "จำหน่ายแล้ว",
}[s] || "-");

const statusColor = (s: Row["status"]) =>
({
    NORMAL: "bg-green-100 text-green-800",
    RESERVED: "bg-blue-100 text-blue-800",
    IN_USE: "bg-orange-100 text-orange-800",
    BROKEN: "bg-red-100 text-red-800",
    LOST: "bg-gray-100 text-gray-800",
    WAIT_DISPOSE: "bg-yellow-100 text-yellow-800",
    DISPOSED: "bg-purple-100 text-purple-800",
}[s] || "");

export default function StatusKaruphanReport() {
    const [rows, setRows] = useState<Row[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [cond, setCond] = useState<Row["status"] | "">("");

    useEffect(() => {
        (async () => {
            const [eRes, cRes] = await Promise.all([
                fetch("/api/equipment?sort=receivedDate:desc&page=1&pageSize=1000", { cache: "no-store" }),
                fetch("/api/categories", { cache: "no-store" }),
            ]);
            const e = await eRes.json().catch(() => ({ data: [] }));
            const c = await cRes.json().catch(() => ({ data: [] }));
            setRows(Array.isArray(e?.data) ? e.data : []);
            setCats(Array.isArray(c?.data) ? c.data : []);
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = (search || "").toLowerCase();
        return (rows || [])
            .filter(r =>
                (!cond || r.status === cond) &&
                ((r.name || "").toLowerCase().includes(q) ||
                    (r.code || "").toLowerCase().includes(q) ||
                    (r.category?.name?.toLowerCase() ?? "").includes(q))
            )
            .filter(r => {
                if (!cat) return true;
                return r.category?.name === cat;
            })
            .sort((a, b) => {
                const da = new Date(a.receivedDate || "").getTime();
                const db = new Date(b.receivedDate || "").getTime();
                return sort === "newest" ? db - da : da - db;
            });
    }, [rows, search, cat, cond, sort]);

    const toDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("th-TH") : "-");

    const handleExcelExport = () => {
        const headers = ["ลำดับ", "เลขครุภัณฑ์", "ชื่อครุภัณฑ์", "หมวดหมู่", "วันที่ได้รับ", "สถานะ"];
        const lines = filtered.map((r, i) => [
            i + 1,
            r.code ?? "",
            `"${r.name ?? "-"}"`,
            `"${r.category?.name ?? "-"}"`,
            toDate(r.receivedDate),
            `"${statusLabelTH(r.status)}"`,
        ].join(","));
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
                        placeholder="ค้นหาครุภัณฑ์"
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
                            <th className="border px-4 py-3 text-center font-medium">หมวดหมู่</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่ได้รับ</th>
                            <th className="border px-4 py-3 text-center font-medium">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={6} className="border px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลครุภัณฑ์</td></tr>}
                        {filtered.map((r, i) => (
                            <tr key={r.number} className="hover:bg-gray-50">
                                <td className="border px-4 py-3 text-center">{i + 1}</td>
                                <td className="border px-4 py-3 text-center">{r.code}</td>
                                <td className="border px-4 py-3 text-center">{r.name}</td>
                                <td className="border px-4 py-3 text-center">{r.category?.name ?? "-"}</td>
                                <td className="border px-4 py-3 text-center">{toDate(r.receivedDate)}</td>
                                <td className="border px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor(r.status)}`}>{statusLabelTH(r.status)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center justify-between px-4 py-3 border-t mt-4">
                <span className="text-sm text-gray-700">แสดง {filtered.length} รายการ จากทั้งหมด {rows.length} รายการ</span>  
            </div>
            </div>
        </div>
    );
}

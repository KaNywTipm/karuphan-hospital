"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Equip = {
    number: number;
    code: string;
    idnum?: string | null;
    name: string;
    description?: string | null;
    category?: { id: number; name: string } | null;
    receivedDate?: string | null;
    price?: number | null | string;
    status: "NORMAL" | "RESERVED" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    currentRequestId?: number | null;
};

type Category = { id: number; name: string };

export default function TotalAmountReport() {
    const [rows, setRows] = useState<Equip[]>([]);
    const [cats, setCats] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");

    useEffect(() => {
        (async () => {
            const [eRes, cRes] = await Promise.all([
                fetch(`/api/equipment?sort=receivedDate:${sort === "newest" ? "desc" : "asc"}&page=1&pageSize=500`, {
                    method: "GET",
                    cache: "no-store",
                    headers: { Accept: "application/json" }
                }),
                fetch("/api/categories", { cache: "no-store" }),
            ]);

            try {
                const e = await eRes.json().catch(() => ({ data: [] }));
                const c = await cRes.json().catch(() => ({ data: [] }));
                setRows(Array.isArray(e?.data) ? e.data : []);
                setCats(Array.isArray(c?.data) ? c.data : []);
            } catch (err) {
                console.error("[equipment] fetch failed:", err);
                setRows([]);
                setCats([]);
            }
        })();
    }, [sort]);

    const filtered = useMemo(() => {
        const q = (search || "").toLowerCase();
        return (rows || [])
            .filter(it =>
                (it.code || "").toLowerCase().includes(q) ||
                (it.idnum || "").toLowerCase().includes(q) ||
                (it.name || "").toLowerCase().includes(q) ||
                (it.description || "").toLowerCase().includes(q) ||
                ((it.category?.name || "").toLowerCase().includes(q))
            )
            .filter(it => (cat ? (it.category?.name === cat) : true))
            .sort((a, b) => {
                const da = new Date(a.receivedDate || "").getTime();
                const db = new Date(b.receivedDate || "").getTime();
                return sort === "newest" ? db - da : da - db;
            });
    }, [rows, search, cat, sort]);

    const totalAmount = filtered.reduce((sum, it) => {
        const n = typeof it.price === "number" ? it.price : Number(it.price ?? 0) || 0;
        return sum + n;
    }, 0);
    const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

    const handleExcelExport = () => {
        const headers = ["ลำดับ", "ID", "เลขครุภัณฑ์", "ชื่อครุภัณฑ์", "รายละเอียดครุภัณฑ์", "วันที่ได้รับ", "ราคาเมื่อได้รับ"];
        const lines = filtered.map((it, i) => [
            i + 1,
            it.idnum || "-",
            it.code,
            `"${it.name}"`,
            `"${it.description || "-"}"`,
            it.receivedDate ? new Date(it.receivedDate).toLocaleDateString("th-TH") : "-",
            (typeof it.price === "number" ? it.price : Number(it.price ?? 0) || 0)
        ].join(","));
        const summary = `\n\n"รายการครุภัณฑ์ในคลังรวมทั้งสิ้น ${filtered.length} รายการ",,,,,"${fmt(totalAmount)} บาท"`;
        const csv = [headers.join(","), ...lines].join("\n") + summary;
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `สรุปยอดครุภัณฑ์ในคลัง_${new Date().toLocaleDateString("th-TH")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-NavyBlue">สรุปยอดครุภัณฑ์ในคลัง</h1>
                    <p className="text-sm text-gray-600 mt-1">รายงานแสดงครุภัณฑ์ทั้งหมดที่มีในระบบคลัง</p>
                </div>
                <button onClick={handleExcelExport} className="bg-Green text-White px-4 py-2 rounded-lg hover:bg-green-600">
                    ดาวน์โหลด Excel
                </button>
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
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-white">
                            <th className="border px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border px-4 py-3 text-center font-medium">ID</th>
                            <th className="border px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">รายละเอียดครุภัณฑ์</th>
                            <th className="border px-4 py-3 text-center font-medium">วันที่ได้รับ</th>
                            <th className="border px-4 py-3 text-center font-medium">ราคาเมื่อได้รับ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={7} className="border px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลครุภัณฑ์ในคลัง</td></tr>}
                        {filtered.map((it, i) => (
                            <tr key={it.number} className="hover:bg-gray-50">
                                <td className="border px-4 py-3 text-center">{i + 1}</td>
                                <td className="border px-4 py-3 text-center">{it.idnum || "-"}</td>
                                <td className="border px-4 py-3 text-center">{it.code}</td>
                                <td className="border px-4 py-3 text-center">{it.name}</td>
                                <td className="border px-4 py-3 text-center">
                                    {typeof it.description === "string" && it.description.trim() !== "" ? it.description : "-"}
                                </td>
                                <td className="border px-4 py-3 text-center">
                                    {it.receivedDate ? new Date(it.receivedDate).toLocaleDateString("th-TH") : "-"}
                                </td>
                                <td className="border px-4 py-3 text-center">{fmt(typeof it.price === "number" ? it.price : Number(it.price ?? 0) || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center bg-Blue bg-opacity-5 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-NavyBlue">
                        รายการครุภัณฑ์ในคลังรวมทั้งสิ้น {filtered.length} รายการ
                    </div>
                    <div className="text-xl font-bold text-Blue">{fmt(totalAmount)} บาท</div>
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t mt-4">
                <span className="text-sm text-gray-700">แสดง {filtered.length} รายการ จากทั้งหมด {rows.length} รายการ</span>  
            </div>
        </div>
    );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Addkaruphan from "@/components/modal/Add-karuphan";
import Editkaruphan from "@/components/modal/Edit-karuphan";

const itemsPerPage = 10;

type Row = {
    number: number;
    code: string;
    idnum?: string | null;
    name: string;
    description?: string | null;
    price?: number | null;
    receivedDate: string; // ISO date string
    status: "NORMAL" | "RESERVED" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    category?: { id: number; name: string } | null;
    busy?: boolean;
    available?: number;
};

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
}[s]);

const statusColor = (s: Row["status"]) =>
({
    NORMAL: "bg-green-100 text-green-800",
    RESERVED: "bg-blue-100 text-blue-800",
    IN_USE: "bg-orange-100 text-orange-800",
    BROKEN: "bg-red-100 text-red-800",
    LOST: "bg-gray-100 text-gray-800",
    WAIT_DISPOSE: "bg-yellow-100 text-yellow-800",
    DISPOSED: "bg-purple-100 text-purple-800",
}[s]);

// วันไทย
function formatThaiDate(input?: string) {
    if (!input) return "-";
    const d = new Date(input);
    if (isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

// ราคา
const formatPrice = (n?: number | null) =>
    n == null ? "-" : Number(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function ListKaruphan() {
    const [items, setItems] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);

    // ตัวกรองหมวดหมู่
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState<number | "all">("all");

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Row | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const url = `/api/equipment?sort=receivedDate:${sortOrder === "newest" ? "desc" : "asc"}&page=1&pageSize=500`;
        const res = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
        });

        try {
            if (!res.ok) {
                const raw = await res.text();
                throw new Error(`HTTP ${res.status} ${res.statusText} :: ${raw?.slice(0, 200) || "no-body"}`);
            }
            const ct = res.headers.get("content-type") || "";
            if (res.status === 204 || res.status === 304 || !ct.includes("application/json")) {
                setItems([]);
            } else {
                const json = await res.json();
                setItems(json?.data ?? json ?? []);
            }
        } catch (err) {
            console.error("[equipment] fetch failed:", err);
            setItems([]);
        } finally {
            setLoading(false);
            setCurrentPage(1);
        }
    }, [sortOrder]);

    useEffect(() => {
        load();
    }, [load, sortOrder]);

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/categories?activeOnly=1", { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                const list = Array.isArray(j?.data) ? j.data : Array.isArray(j?.categories) ? j.categories : [];
                setCategories(list);
            } catch (e) {
                console.error("load categories failed", e);
                setCategories([]);
            }
        })();
    }, []);

    // กรอง
    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        let list = items;
        if (categoryId !== "all") {
            list = list.filter((it) => it.category?.id === categoryId);
        }
        if (!q) return list;

        return list.filter(
            (item) =>
                item.name.toLowerCase().includes(q) ||
                item.code.toLowerCase().includes(q) ||
                (item.category?.name?.toLowerCase() ?? "").includes(q) ||
                statusLabelTH(item.status).toLowerCase().includes(q)
        );
    }, [items, searchTerm, categoryId]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    const handleAddClick = () => setShowAddModal(true);
    const handleEditClick = (row: Row) => {
        setSelectedItem(row);
        setShowEditModal(true);
    };
    const handleCloseModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedItem(null);
    };
    const handleAdded = async () => {
        handleCloseModal();
        await load();
    };
    const handleUpdated = async () => {
        handleCloseModal();
        await load();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <section className="bg-white rounded-lg shadow border">
                {/* --------- แถบควบคุม --------- */}
                <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
                    {/* ซ้าย: หมวดหมู่ */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-NavyBlue">หมวดหมู่:</label>
                        <select
                            value={categoryId}
                            onChange={(e) => {
                                const v = e.target.value;
                                setCategoryId(v === "all" ? "all" : Number(v));
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                            title="กรองตามหมวดหมู่"
                        >
                            <option value="all">ทั้งหมด</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ขวา: เพิ่ม + ค้นหา + สลับเรียง */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={handleAddClick}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Image src="/plus.png" alt="add" width={16} height={16} />
                            เพิ่มข้อมูลครุภัณฑ์
                        </button>

                        <div className="relative w-72">
                            <input
                                type="text"
                                placeholder="ค้นหาครุภัณฑ์"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-4 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Image src="/search.png" alt="search" width={20} height={20} className="opacity-50" />
                            </div>
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

                {/* --------- ตาราง --------- */}
                {loading ? (
                    <div className="p-6 text-gray-500">กำลังโหลด...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="bg-Pink text-White">
                                    <tr>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold w-[80px]">ลำดับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold w-[120px]">ID</th>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold w-[180px]">เลขครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold">ชื่อครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-left  text-sm font-semibold w-[180px]">รายละเอียดครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-right text-sm font-semibold w-[180px]">ราคาเมื่อได้รับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold w-[150px]">วันที่ได้รับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-semibold w-[120px]">สถานะ</th>
                                        <th className="border px-2 py-3 text-center text-sm font-semibold w-[90px]">แก้ไข</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {currentItems.map((item, index) => {
                                        // ปุ่มแก้ไขควรกดได้ทุกสถานะ (ยกเว้นถ้าต้องการบล็อกเฉพาะ IN_USE ให้แก้เป็น item.status === "IN_USE")
                                        const isBusy = false;
                                        return (
                                            <tr key={item.number} className="hover:bg-gray-50">
                                                <td className="border px-4 py-3 text-center">{startIndex + index + 1}</td>
                                                <td className="border px-4 py-3 text-center">{item.idnum}</td>
                                                <td className="border px-4 py-3 text-center">{item.code}</td>
                                                <td className="border px-4 py-3">
                                                    <div className="flex items-center justify-start gap-2">
                                                        <span className="truncate">{item.name}</span>
                                                        {isBusy && (
                                                            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                                กำลังถูกยืม
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="border px-4 py-3 text-left">
                                                    {typeof item.description === "string" && item.description.trim() !== "" ? item.description : "-"}
                                                </td>
                                                <td className="border px-4 py-3 text-right">{formatPrice(item.price)}</td>
                                                <td className="border px-4 py-3 text-center">{formatThaiDate(item.receivedDate)}</td>
                                                <td className="border px-4 py-3 text-center">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor(
                                                            item.status
                                                        )}`}
                                                    >
                                                        {statusLabelTH(item.status)}
                                                    </span>
                                                </td>
                                                <td className="border px-2 py-3 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="bg-Yellow text-White px-3 py-1 rounded text-sm hover:bg-yellow-600"
                                                        title="แก้ไขครุภัณฑ์"
                                                    >
                                                        <Image src="/edit.png" alt="edit" width={20} height={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!currentItems.length && (
                                        <tr>
                                            <td colSpan={9} className="border px-4 py-6 text-center text-sm text-gray-500">
                                                ไม่พบครุภัณฑ์ที่ค้นหา
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* เพจจิ้ง */}
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <span className="text-sm text-gray-700">
                                แสดง {filteredData.length ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)} จาก{" "}
                                {filteredData.length} รายการ
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    disabled={currentPage === 1}
                                >
                                    ← Previous
                                </button>
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                                    {currentPage}
                                </span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* โมดอล */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <Addkaruphan onClose={handleCloseModal} onAdd={handleAdded} />
                </div>
            )}
            {showEditModal && selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <Editkaruphan item={selectedItem} onClose={handleCloseModal} onUpdate={handleUpdated} />
                </div>
            )}
        </div>
    );
}

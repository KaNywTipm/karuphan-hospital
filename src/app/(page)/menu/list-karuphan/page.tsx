"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Addkaruphan from "@/components/modal/Add-karuphan";
import Editkaruphan from "@/components/modal/Edit-karuphan";

const itemsPerPage = 5;

type Row = {
    number: number;            // PK จาก DB
    code: string;
    idnum?: string | null;
    name: string;
    description?: string | null;
    price?: number | null;
    receivedDate: string;      // "YYYY-MM-DD" (ค.ศ.)
    status: "NORMAL" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    category?: { id: number; name: string } | null;
};

const statusLabelTH = (s: Row["status"]) =>
({
    NORMAL: "ปกติ",
    IN_USE: "กำลังใช้งาน",
    BROKEN: "ชำรุด",
    LOST: "สูญหาย",
    WAIT_DISPOSE: "รอจำหน่าย",
    DISPOSED: "จำหน่ายแล้ว",
}[s]);

const statusColor = (s: Row["status"]) =>
({
    NORMAL: "bg-green-100 text-green-800",
    IN_USE: "bg-orange-100 text-orange-800",
    BROKEN: "bg-red-100 text-red-800",
    LOST: "bg-gray-100 text-gray-800",
    WAIT_DISPOSE: "bg-yellow-100 text-yellow-800",
    DISPOSED: "bg-purple-100 text-purple-800",
}[s]);

export default function ListKaruphan() {
    const [items, setItems] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Row | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/equipment?sort=receivedDate:${sortOrder === "newest" ? "desc" : "asc"}&page=1&pageSize=500`, { cache: "no-store" });
        const json = await res.json();
        setItems(json?.data ?? []);
        setLoading(false);
        setCurrentPage(1);
    }, [sortOrder]);

    useEffect(() => { load(); }, [load, sortOrder]);

    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) =>
            item.name.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q) ||
            (item.category?.name?.toLowerCase() ?? "").includes(q) ||
            statusLabelTH(item.status).toLowerCase().includes(q)
        );
    }, [items, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    const formatDate = (ymd: string) => {
        const [y, m, d] = ymd.split("-");
        return `${d}/${m}/${y}`;
    };
    const formatPrice = (n?: number | null) => (n == null ? "-" : n.toLocaleString());

    const handleAddClick = () => setShowAddModal(true);
    const handleEditClick = (row: Row) => { setSelectedItem(row); setShowEditModal(true); };
    const handleCloseModal = () => { setShowAddModal(false); setShowEditModal(false); setSelectedItem(null); };

    // callback หลังบันทึกเสร็จ ให้ reload จาก DB
    const handleAdded = async () => { handleCloseModal(); await load(); };
    const handleUpdated = async () => { handleCloseModal(); await load(); };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">จัดการครุภัณฑ์</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={handleAddClick} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Image src="/plus.png" alt="add" width={16} height={16} />
                            เพิ่มข้อมูลครุภัณฑ์
                        </button>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาครุภัณฑ์"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image src="/search.png" alt="search" width={20} height={20} className="absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <button
                            onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                        >
                            <Image src="/HamBmenu.png" alt="sort" width={20} height={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-gray-500">กำลังโหลด...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed border-collapse">
                                <thead className="bg-Pink text-White">
                                    <tr>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[80px]">ลำดับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[120px]">ID</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[180px]">เลขครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium">ชื่อครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[220px]">รายละเอียดครุภัณฑ์</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[120px]">ราคาเมื่อได้รับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[110px]">วันที่ได้รับ</th>
                                        <th className="border px-4 py-3 text-center text-sm font-medium w-[120px]">สถานะ</th>
                                        <th className="border px-2 py-3 text-center text-sm font-medium w-[90px]">แก้ไข</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {currentItems.map((item, index) => (
                                        <tr key={item.number} className="hover:bg-gray-50">
                                            <td className="border px-4 py-3 text-center">{startIndex + index + 1}</td>
                                            <td className="border px-4 py-3 text-center">{item.idnum}</td>
                                            <td className="border px-4 py-3 text-center">{item.code}</td>
                                            <td className="border px-4 py-3 text-center">{item.name}</td>
                                            <td className="border px-4 py-3 text-center">{item.description || item.category?.name || "-"}</td>
                                            <td className="border px-4 py-3 text-center">{formatPrice(item.price)}</td>
                                            <td className="border px-4 py-3 text-center">{formatDate(item.receivedDate)}</td>
                                            <td className="border px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor(item.status)}`}>
                                                    {statusLabelTH(item.status)}
                                                </span>
                                            </td>
                                            <td className="border px-2 py-3 text-center">
                                                <button onClick={() => handleEditClick(item)} className="bg-Yellow text-White px-3 py-1 rounded text-sm hover:bg-yellow-600">
                                                    <Image src="/edit.png" alt="edit" width={20} height={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

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

                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <span className="text-sm text-gray-700">
                                แสดง {filteredData.length ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    disabled={currentPage === 1}>
                                    ← Previous
                                </button>
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                                    {currentPage}
                                </span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                    disabled={currentPage === totalPages || totalPages === 0}>
                                    Next →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

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

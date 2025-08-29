"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import BorrowCart from "@/components/BorrowCart";

type Category = { id: number; name: string };
type EquipFromApi = {
    number: number; code: string; name: string;
    description?: string | null; receivedDate: string;
    status: "NORMAL" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    category?: { id: number; name: string } | null;
};
type RowUI = {
    id: number; code: string; name: string; category: string; categoryId?: number;
    details?: string; receivedDate: string; status: EquipFromApi["status"];
};
type CartItem = { id: number; code: string; name: string; category: string; details?: string; quantity: number };

const itemsPerPage = 5;

export default function ExternalBorrowPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<RowUI[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [recentlyRemoved, setRecentlyRemoved] = useState<CartItem | null>(null);

    const mapToUI = (r: EquipFromApi): RowUI => ({
        id: r.number,
        code: r.code,
        name: r.name,
        category: r.category?.name ?? "",
        categoryId: r.category?.id,
        details: r.description ?? "",
        receivedDate: r.receivedDate,
        status: r.status,
    });

    const load = useCallback(async () => {
        setLoading(true);
        const [catRes, eqRes] = await Promise.all([
            fetch("/api/categories", { cache: "no-store" }),
            fetch(`/api/equipment?status=NORMAL&sort=receivedDate:${sortOrder === "newest" ? "desc" : "asc"}&page=1&pageSize=1000`, { cache: "no-store" }),
        ]);
        const cats: Category[] = await catRes.json();
        const eqJson = await eqRes.json();
        const rows: RowUI[] = (eqJson?.data || []).map(mapToUI);
        setCategories(cats || []);
        setItems(rows);
        setLoading(false);
        setCurrentPage(1);
    }, [sortOrder]);

    useEffect(() => { load(); }, [load]);

    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return items
            .filter((item) => {
                const mSearch =
                    item.name.toLowerCase().includes(q) ||
                    item.code.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q);
                const mCat = selectedCategory === "" || item.categoryId === Number(selectedCategory);
                return mSearch && mCat;
            })
            .sort((a, b) => {
                const aT = new Date(a.receivedDate).getTime();
                const bT = new Date(b.receivedDate).getTime();
                return sortOrder === "newest" ? bT - aT : aT - bT;
            });
    }, [items, searchTerm, selectedCategory, sortOrder]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    // ---- cart ----
    const handleAddToCart = (equipment: RowUI) => {
        setCartItems((prev) => {
            const exist = prev.find((x) => x.id === equipment.id);
            if (exist) { alert("ครุภัณฑ์ชิ้นนี้อยู่ในตะกร้าแล้ว"); return prev; }
            return [...prev, { id: equipment.id, code: equipment.code, name: equipment.name, category: equipment.category, details: equipment.details, quantity: 1 }];
        });
    };
    const handleRemoveFromCart = (id: number) => {
        const it = cartItems.find((x) => x.id === id);
        if (it && confirm(`ต้องการลบ "${it.name}" ออกจากรายการยืมหรือไม่?`)) {
            setCartItems((prev) => prev.filter((x) => x.id !== id));
            setRecentlyRemoved(it);
            setTimeout(() => setRecentlyRemoved(null), 5000);
        }
    };
    const handleUpdateQuantity = () => { }; // ภายนอก 1 ชิ้น = 1 รายการ
    const handleClearCart = () => setCartItems([]);

    const handleSelectItem = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const handleSelectAll = () => {
        if (selectedIds.length === currentItems.length) setSelectedIds([]);
        else setSelectedIds(currentItems.map((x) => x.id));
    };
    const handleAddSelectedToCart = () => {
        currentItems.filter((x) => selectedIds.includes(x.id)).forEach(handleAddToCart);
        setSelectedIds([]);
    };

    // ---- submit borrow (EXTERNAL) ----
    const handleBorrowSubmit = async (borrowData: any) => {
        const payload = {
            borrowerType: "EXTERNAL" as const,
            returnDue: borrowData?.returnDue,
            reason: borrowData?.reason ?? null,
            notes: borrowData?.notes ?? null,
            // ถ้าเก็บข้อมูลผู้ติดต่อใน BorrowCart (ชื่อ/เบอร์/หน่วยงาน) ส่งแนบไปด้วยได้
            externalName: borrowData?.externalName ?? null,
            externalDept: borrowData?.externalDept ?? null,
            externalPhone: borrowData?.externalPhone ?? null,
            items: cartItems.map((it) => ({ equipmentId: it.id, quantity: 1 })),
        };

        const res = await fetch("/api/borrow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { alert(json?.error || "ส่งคำขอยืมไม่สำเร็จ"); return; }

        await load();
        setCartItems([]);
        alert("ส่งคำขอยืมเรียบร้อย (รออนุมัติ)");
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex gap-8">
            <div className="flex-1">
                <section className="bg-white rounded-lg shadow border">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">รายการครุภัณฑ์ที่สามารถยืมได้ (เจ้าหน้าที่นอกแผนก)</h2>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">ทุกหมวดหมู่</option>
                                    {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="relative">
                                <input
                                    type="text" placeholder="ค้นหาครุภัณฑ์"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <Image src="/search.png" alt="search" width={20} height={20}
                                    className="absolute left-3 top-1/2 -translate-y-1/2" />
                            </div>

                            <button
                                onClick={() => setSortOrder(p => p === "newest" ? "oldest" : "newest")}
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
                                            <th className="border px-4 py-3 text-center w-[40px]">
                                                <input type="checkbox"
                                                    checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                                                    onChange={handleSelectAll} />
                                            </th>
                                            <th className="border px-4 py-3 text-center w-[80px]">ลำดับ</th>
                                            <th className="border px-4 py-3 text-center w-[150px]">เลขครุภัณฑ์</th>
                                            <th className="border px-4 py-3 text-center">ชื่อครุภัณฑ์</th>
                                            <th className="border px-4 py-3 text-center w-[200px]">รายละเอียด</th>
                                            <th className="border px-4 py-3 text-center w-[120px]">เพิ่ม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {currentItems.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="border px-4 py-3 text-center">
                                                    <input type="checkbox"
                                                        checked={selectedIds.includes(item.id)}
                                                        onChange={() => handleSelectItem(item.id)} />
                                                </td>
                                                <td className="border px-4 py-3 text-center">{startIndex + index + 1}</td>
                                                <td className="border px-4 py-3 text-center">{item.code}</td>
                                                <td className="border px-4 py-3 text-center">{item.name}</td>
                                                <td className="border px-4 py-3 text-center">{item.details || item.category}</td>
                                                <td className="border px-4 py-3 text-center">
                                                    <button onClick={() => handleAddToCart(item)}
                                                        className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200">
                                                        เพิ่มลงรายการ
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!currentItems.length && (
                                            <tr><td colSpan={6} className="border px-4 py-6 text-center text-gray-500">ไม่พบครุภัณฑ์ที่ว่าง</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4">
                                <button onClick={handleAddSelectedToCart} disabled={selectedIds.length === 0}
                                    className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50">
                                    เพิ่มรายการที่เลือกลงตะกร้า
                                </button>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <span className="text-sm text-gray-700">
                                    แสดง {filteredData.length ? startIndex + 1 : 0} - {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700" disabled={currentPage === 1}>
                                        ← Previous
                                    </button>
                                    <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">{currentPage}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                                        disabled={currentPage === totalPages || totalPages === 0}>
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            <div className="w-80">
                <BorrowCart
                    cartItems={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveFromCart}
                    onClearCart={handleClearCart}
                    borrowerType="external"
                    onBorrowSubmit={handleBorrowSubmit}
                />
            </div>

            {recentlyRemoved && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
                    <span className="text-sm">ลบ “{recentlyRemoved.name}” แล้ว</span>
                    <button
                        onClick={() => {
                            setCartItems((prev) => [...prev, recentlyRemoved]);
                            setRecentlyRemoved(null);
                        }}
                        className="bg-white text-green-600 px-3 py-1 rounded text-sm hover:bg-gray-100">
                        เลิกทำ
                    </button>
                </div>
            )}
        </div>
    );
}

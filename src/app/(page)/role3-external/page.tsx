"use client";


// --- Helper & Components ---
const BORROWER_TYPE: "INTERNAL" | "EXTERNAL" = "EXTERNAL";
type Status = "NORMAL" | "RESERVED" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
const STATUS_MAP: Record<Status, { label: string; cls: string }> = {
    NORMAL: { label: "ปกติ", cls: "bg-emerald-100 text-emerald-800" },
    RESERVED: { label: "รออนุมัติ", cls: "bg-blue-100 text-blue-800" },
    IN_USE: { label: "กำลังใช้งาน", cls: "bg-amber-100 text-amber-800" },
    BROKEN: { label: "ชำรุด", cls: "bg-red-100 text-red-800" },
    LOST: { label: "สูญหาย", cls: "bg-gray-100 text-gray-800" },
    WAIT_DISPOSE: { label: "รอจำหน่าย", cls: "bg-yellow-100 text-yellow-800" },
    DISPOSED: { label: "จำหน่ายแล้ว", cls: "bg-purple-100 text-purple-800" },
};
function StatusBadge({ status }: { status: Status }) {
    const m = STATUS_MAP[status];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
            {m.label}
        </span>
    );
}
function BorrowButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold
                        ${disabled
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"}`}
            title={disabled ? "สถานะนี้ยืมไม่ได้" : "ยืมครุภัณฑ์ชิ้นนี้"}
            aria-disabled={disabled ? 'true' : undefined}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-90">
                <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13l-2 6h13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            ยืม
        </button>
    );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import BorrowCart from "@/components/BorrowCart";
import BorrowKaruphan from "@/components/modal/borrow-karuphan";

type Category = { id: number | string; name: string };
function asList<T = any>(v: any): T[] {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.data)) return v.data;
    return [];
}
type EquipFromApi = {
    number: number; code: string; name: string;
    description?: string | null; receivedDate: string;
    status: Status;
    category?: { id: number; name: string } | null;
};
type RowUI = {
    id: number;
    code: string;
    name: string;
    category: string;
    categoryId?: number;
    details?: string;
    receivedDate: string;
    status: Status;
    busy?: boolean;
};
type CartItem = { id: number; code: string; name: string; category: string; details?: string; quantity: number };
const itemsPerPage = 5;


export default function ExternalBorrowPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const list: Category[] = asList(categories);
    const [items, setItems] = useState<RowUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [recentlyRemoved, setRecentlyRemoved] = useState<CartItem | null>(null);
    // Quick borrow modal state
    const [showQuickBorrow, setShowQuickBorrow] = useState(false);
    const [quickItem, setQuickItem] = useState<RowUI | null>(null);

    const mapToUI = (r: EquipFromApi): RowUI => ({
        id: r.number,
        code: r.code,
        name: r.name,
        category: r.category?.name ?? "",
        categoryId: r.category?.id,
        details: r.description ?? "",
        receivedDate: r.receivedDate,
        status: r.status,
        busy: r.status !== "NORMAL", // RESERVED และสถานะอื่น ๆ จะถูกปิดการยืม
    });

    const load = useCallback(async () => {
        setLoading(true);
        const [catRes, eqRes] = await Promise.all([
            fetch("/api/categories", { cache: "no-store" }),
            fetch(`/api/equipment?sort=receivedDate:${sortOrder === "newest" ? "desc" : "asc"}&page=1&pageSize=1000`, { cache: "no-store" }),
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
    const handleUpdateQuantity = () => { };
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
            borrowerType: BORROWER_TYPE,
            returnDue: borrowData?.returnDue,
            reason: borrowData?.reason ?? null,
            notes: borrowData?.notes ?? null,
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
                                    {list.map((c) => (
                                        <option key={String(c.id)} value={String(c.id)}>
                                            {c.name}
                                        </option>
                                    ))}
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
                                            <th className="border px-4 py-3 text-center w-[180px]">เลขครุภัณฑ์</th>
                                            <th className="border px-4 py-3 text-center">ชื่อครุภัณฑ์</th>
                                            <th className="border px-4 py-3 text-center w-[200px]">รายละเอียด</th>
                                            <th className="border px-4 py-3 text-center w-[130px]">สถานะ</th>
                                            <th className="border px-4 py-3 text-center w-[110px]">ยืม</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {currentItems.map((row, idx) => {
                                            const isBusy = row.status !== "NORMAL";
                                            return (
                                                <tr key={row.id} className="hover:bg-gray-50">
                                                    <td className="border px-4 py-3 text-center">
                                                        <input type="checkbox"
                                                            checked={selectedIds.includes(row.id)}
                                                            onChange={() => handleSelectItem(row.id)}
                                                            disabled={isBusy}
                                                        />
                                                    </td>
                                                    <td className="border px-4 py-3 text-center">{startIndex + idx + 1}</td>
                                                    <td className="border px-4 py-3 text-center">{row.code}</td>
                                                    <td className="border px-4 py-3 text-center">{row.name}</td>
                                                    <td className="border px-4 py-3 text-center">{row.details || row.category}</td>
                                                    <td className="border px-4 py-3 text-center">
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                    <td className="border px-4 py-3 text-center">
                                                        <BorrowButton
                                                            disabled={isBusy}
                                                            onClick={() => {
                                                                setQuickItem(row);
                                                                setShowQuickBorrow(true);
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {!currentItems.length && (
                                            <tr><td colSpan={7} className="border px-4 py-6 text-center text-gray-500">ไม่พบครุภัณฑ์</td></tr>
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
            {/* Quick Borrow Modal */}
            {showQuickBorrow && quickItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <BorrowKaruphan
                        selectedEquipment={null}
                        cartItems={[{
                            id: quickItem.id,
                            code: quickItem.code,
                            name: quickItem.name,
                            category: quickItem.category ?? "",
                            quantity: 1,
                        }]}
                        onClose={() => { setShowQuickBorrow(false); setQuickItem(null); }}
                        onBorrow={async (form) => {
                            const payload = {
                                borrowerType: BORROWER_TYPE,
                                returnDue: form.returnDue,
                                reason: form.reason ?? null,
                                notes: form.notes ?? null,
                                externalName: (form.external && 'name' in form.external) ? (form.external as any).name ?? null : null,
                                externalDept: (form.external && 'dept' in form.external) ? (form.external as any).dept ?? null : null,
                                externalPhone: (form.external && 'phone' in form.external) ? (form.external as any).phone ?? null : null,
                                items: [{ equipmentId: quickItem.id, quantity: 1 }],
                            };
                            const res = await fetch("/api/borrow", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload),
                            });
                            const json = await res.json().catch(() => ({}));
                            if (!res.ok || json?.ok !== true) {
                                alert(json?.error || "ยืมไม่สำเร็จ");
                                return;
                            }
                            setShowQuickBorrow(false);
                            setQuickItem(null);
                            await load();
                        }}
                    />
                </div>
            )}
        </div>
    );
}

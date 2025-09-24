"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUserModals } from "@/components/Modal-Notification/UserModalSystem";

const itemsPerPage = 5; //fucn. all

type Category = {
    id: number;
    name: string;
    description: string | null;
    createdAt: string;
};

export default function CategoryKaruphan() {
    const { alert, confirm, AlertModal, ConfirmModal } = useUserModals();

    // data state
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ui state
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    // add form
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // edit inline
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    // ====== helpers ======
    const safeJson = async (res: Response) => {
        // ป้องกันกรณี 204/ไม่มี body → json() จะพัง
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) return null;
        try { return await res.json(); } catch { return null; }
    };
    const load = async () => {
        try {
            setLoading(true);
            const url = `/api/categories?sort=id:${sortOrder === "newest" ? "desc" : "asc"}&page=1&pageSize=500`;
            console.log("Loading categories with URL:", url);
            const res = await fetch(url, {
                cache: "no-store",
                headers: { Accept: "application/json" }
            });
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");
            // API now returns { ok: true, data: [...] }
            const categoryData = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
            console.log("Categories loaded:", categoryData.length, "items");
            setItems(categoryData);
            setError(null);
        } catch (e: any) {
            console.error("Load categories error:", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortOrder]);

    const filteredData = useMemo(() => {
        console.log("Filtering data, sortOrder:", sortOrder, "items count:", items.length);
        const term = searchTerm.trim().toLowerCase();
        let filtered = items.filter(
            (i) =>
                i.name.toLowerCase().includes(term) ||
                (i.description ?? "").toLowerCase().includes(term)
        );

        // If API doesn't support sorting, fall back to client-side sorting
        if (filtered.length > 0) {
            filtered = filtered.sort((a, b) => {
                if (sortOrder === "newest") {
                    return b.id - a.id; // Sort by ID descending (newest first)
                } else {
                    return a.id - b.id; // Sort by ID ascending (oldest first)
                }
            });
        }

        console.log("Filtered and sorted data:", filtered.length, "items");
        return filtered;
    }, [items, searchTerm, sortOrder]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    const nextIndex = items.length + 1;

    const goToPreviousPage = () => setCurrentPage((p) => Math.max(1, p - 1));
    const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

    // ====== CRUD actions ======
    const createItem = async () => {
        if (!newName.trim()) return;
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim(), description: newDesc || null }),
            });
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "ไม่สามารถเพิ่มหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง");
            setNewName("");
            setNewDesc("");
            await load();
            // แจ้งเตือนการเพิ่มหมวดหมู่สำเร็จ
            alert.success("เพิ่มหมวดหมู่เรียบร้อยแล้ว");
            // กระโดดไปหน้าสุดท้ายหลังเพิ่ม
            const count = filteredData.length + 1;
            setCurrentPage(Math.ceil(count / itemsPerPage));
        } catch (e: any) {
            alert.error(e.message);
        }
    };

    const startEdit = (row: Category) => {
        setEditId(row.id);
        setEditName(row.name);
        setEditDesc(row.description ?? "");
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditName("");
        setEditDesc("");
    };

    const saveEdit = async (id: number) => {
        if (!editName.trim()) return;
        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDesc || null,
                }),
            });
            const data = await safeJson(res);
            if (!res.ok) throw new Error(data?.error || "ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง");
            await load();
            cancelEdit();
            alert.success("แก้ไขข้อมูลหมวดหมู่เรียบร้อยแล้ว");
        } catch (e: any) {
            alert.error(e.message);
        }
    };

    const removeItem = async (id: number) => {
        confirm.show(
            "ยืนยันการลบหมวดหมู่นี้?",
            async () => {
                try {
                    // ตรวจสอบว่าหมวดหมู่นี้มีครุภัณฑ์อยู่หรือไม่
                    const checkRes = await fetch(`/api/categories/${id}/equipment-count`, { cache: "no-store" });
                    const checkData = await safeJson(checkRes);

                    if (checkRes.ok && checkData?.count > 0) {
                        confirm.show(
                            `หมวดหมู่นี้มีครุภัณฑ์ ${checkData.count} รายการ\nต้องการลบแบบ Hard Delete หรือไม่?\n(ครุภัณฑ์ทั้งหมดในหมวดนี้จะถูกลบด้วย)`,
                            async () => {
                                // ส่ง query parameter hardDelete=true เพื่อบอก API ให้ลบแบบ hard delete
                                const res = await fetch(`/api/categories/${id}?hardDelete=true`, { method: "DELETE" });
                                const data = await safeJson(res);
                                if (!res.ok) throw new Error(data?.error || "ไม่สามารถลบหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง");
                                await load();
                                alert.success("ลบหมวดหมู่และครุภัณฑ์ทั้งหมดเรียบร้อยแล้ว");
                                // ถ้าลบแล้วหน้าปัจจุบันไม่มีรายการ ให้ถอยหน้าลง
                                setCurrentPage((p) => {
                                    const after = Math.ceil((filteredData.length - 1) / itemsPerPage) || 1;
                                    return Math.min(p, after);
                                });
                            },
                            { type: "danger", title: "คำเตือน: การลบแบบ Hard Delete" }
                        );
                        return;
                    }

                    // ถ้าไม่มีครุภัณฑ์ในหมวดนี้ ลบได้เลย
                    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
                    const data = await safeJson(res);
                    if (!res.ok) throw new Error(data?.error || "ไม่สามารถลบหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง");
                    await load();
                    alert.success("ลบหมวดหมู่เรียบร้อยแล้ว");
                    // ถ้าลบแล้วหน้าปัจจุบันไม่มีรายการ ให้ถอยหน้าลง
                    setCurrentPage((p) => {
                        const after = Math.ceil((filteredData.length - 1) / itemsPerPage) || 1;
                        return Math.min(p, after);
                    });
                } catch (e: any) {
                    alert.error(e.message);
                }
            },
            { type: "danger", title: "ยืนยันการลบ" }
        );
    };

    // ====== render ======
    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            {/* Section: Table */}
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">หมวดหมู่ครุภัณฑ์</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาหมวดหมู่"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image
                                src="/search.png"
                                alt="search"
                                width={20}
                                height={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                        </div>
                        <button
                            onClick={() => {
                                console.log("Sort button clicked! Current order:", sortOrder);
                                const newOrder = sortOrder === "newest" ? "oldest" : "newest";
                                console.log("Changing to:", newOrder);
                                setSortOrder(newOrder);
                            }}
                            className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition duration-150 flex items-center justify-center
                                }`}
                            title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                        >
                            <Image src="/HamBmenu.png" alt="เรียงข้อมูล" width={20} height={20} />
                            <span className="sr-only">เรียงข้อมูล</span>
                            <span className="ml-1 text-xs font-medium">
                            </span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-gray-500">กำลังโหลด...</div>
                ) : error ? (
                    <div className="p-6 text-red-600">{error}</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                                <thead className="bg-Pink text-White">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-1/12">ลำดับ</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-4/12">ชื่อหมวดหมู่</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">คำอธิบาย</th>
                                        <th className="px-2 py-3 text-center text-sm font-medium w-[90px]">แก้ไข</th>
                                        <th className="px-2 py-3 text-center text-sm font-medium w-[90px]">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {currentItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {editId === item.id ? (
                                                    <input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-Blue"
                                                    />
                                                ) : (
                                                    item.name
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {editId === item.id ? (
                                                    <input
                                                        value={editDesc}
                                                        onChange={(e) => setEditDesc(e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-Blue"
                                                        placeholder="รายละเอียด (ไม่บังคับ)"
                                                    />
                                                ) : (
                                                    item.description || "-"
                                                )}
                                            </td>
                                            <td className="px-1 py-3 text-sm text-center">
                                                {editId === item.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveEdit(item.id)}
                                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm mr-1 my-1 shadow-sm"
                                                        >
                                                            ✔ บันทึก
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm mr-1 my-1 shadow-sm"
                                                        >
                                                            ✕ ยกเลิก
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(item)}
                                                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm shadow-sm"
                                                        title="แก้ไข"
                                                    >
                                                        <Image src="/edit.png" alt="edit" width={20} height={20} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-2 py-3 text-sm text-center">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                                                    title="ลบ"
                                                >
                                                    <Image src="/delete.png" alt="delete" width={20} height={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!currentItems.length && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                                                ไม่พบหมวดหมู่ที่ค้นหา
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <span className="text-sm text-gray-700">
                                แสดง {filteredData.length === 0 ? 0 : startIndex + 1} -{" "}
                                {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={goToPreviousPage}
                                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    disabled={currentPage === 1}
                                >
                                    ← Previous
                                </button>
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                                    {currentPage}
                                </span>
                                <button
                                    onClick={goToNextPage}
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

            {/* Section: Add Form */}
            <section className="bg-white rounded-lg shadow border p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">เพิ่มหมวดหมู่ครุภัณฑ์</h2>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        createItem();
                    }}
                >
                    <FormRow label="ลำดับ">
                        <input
                            readOnly
                            value={nextIndex}
                            className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="ชื่อหมวดหมู่">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="ชื่อหมวดหมู่ครุภัณฑ์"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="คำอธิบาย">
                        <input
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="รายละเอียด (ไม่บังคับ)"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-4">
                        <button type="submit" className="bg-Blue text-White px-4 py-2 rounded-md">
                            เพิ่มข้อมูล
                        </button>
                    </div>
                </form>
            </section>

            {/* Modal Components */}
            <AlertModal />
            <ConfirmModal />
        </div>
    );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <label className="w-40 font-medium text-gray-700">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

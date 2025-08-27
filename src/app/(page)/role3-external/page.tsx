"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { inCPUData, outCPUData, updateEquipmentStatus, createNewBorrowRequest, equipmentCategories } from "@/lib/data";
import BorrowCart from "@/components/BorrowCart";

interface CartItem {
    id: number;
    code: string;
    name: string;
    category: string;
    details?: string;
    quantity: number;
}

const itemsPerPage = 5;

const ExternalBorrowPage = () => {
    // อัปเดตสถานะครุภัณฑ์ก่อนโหลดข้อมูล
    useEffect(() => {
        updateEquipmentStatus();
    }, []);

    // รวมข้อมูลครุภัณฑ์ทั้งภายในและภายนอก และกรองเฉพาะที่สถานะ "ปกติ"
    const availableEquipment = [...inCPUData, ...outCPUData].filter(item => item.status === "ปกติ");

    const [items, setItems] = useState(availableEquipment);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(""); // เพิ่ม state สำหรับ dropdown
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest"); // เพิ่ม state สำหรับการเรียงข้อมูล
    const [currentPage, setCurrentPage] = useState(1);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [recentlyRemoved, setRecentlyRemoved] = useState<CartItem | null>(null);
    // เพิ่ม state สำหรับเช็คบ็อกซ์
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const filteredData = items.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === "" || item.category === selectedCategory;

        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        // เรียงตาม receivedDate
        const dateA = new Date(a.receivedDate);
        const dateB = new Date(b.receivedDate);

        if (sortOrder === "newest") {
            return dateB.getTime() - dateA.getTime(); // ใหม่ไปเก่า
        } else {
            return dateA.getTime() - dateB.getTime(); // เก่าไปใหม่
        }
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    // ฟังก์ชันเพิ่มครุภัณฑ์ลงตะกร้า (เพิ่มแต่ละชิ้นเป็นรายการแยก)
    const handleAddToCart = (equipment: any) => {
        setCartItems(prevItems => {
            // ตรวจสอบว่ามีครุภัณฑ์ชิ้นนี้อยู่ในตะกร้าแล้วหรือไม่
            const existingItem = prevItems.find(item => item.id === equipment.id);

            if (existingItem) {
                // ถ้ามีแล้ว ไม่ให้เพิ่มซ้ำ แจ้งเตือนผู้ใช้
                alert("ครุภัณฑ์ชิ้นนี้อยู่ในตะกร้าแล้ว");
                return prevItems;
            } else {
                // ถ้ายังไม่มี ให้เพิ่มใหม่
                return [...prevItems, {
                    id: equipment.id,
                    code: equipment.code,
                    name: equipment.name,
                    category: equipment.category,
                    details: equipment.details,
                    quantity: 1
                }];
            }
        });
    };

    // ฟังก์ชันอัปเดตจำนวนในตะกร้า (ไม่ใช้แล้ว เนื่องจากแต่ละชิ้นเป็นรายการแยก)
    const handleUpdateQuantity = (id: number, quantity: number) => {
        // ไม่ต้องทำอะไร เพราะแต่ละชิ้นจะมีจำนวน 1 เสมอ
        return;
    };

    // ฟังก์ชันลบครุภัณฑ์ออกจากตะกร้า
    const handleRemoveFromCart = (id: number) => {
        const itemToRemove = cartItems.find(item => item.id === id);
        if (itemToRemove && confirm(`ต้องการลบ "${itemToRemove.name}" ออกจากรายการยืมหรือไม่?`)) {
            setCartItems(prevItems => prevItems.filter(item => item.id !== id));
            setRecentlyRemoved(itemToRemove);

            // ซ่อนการแจ้งเตือน undo หลัง 5 วินาที
            setTimeout(() => {
                setRecentlyRemoved(null);
            }, 5000);
        }
    };

    // ฟังก์ชันเอาครุภัณฑ์ที่ลบไปกลับมา
    const handleUndoRemove = () => {
        if (recentlyRemoved) {
            setCartItems(prevItems => [...prevItems, recentlyRemoved]);
            setRecentlyRemoved(null);
        }
    };

    // ฟังก์ชันล้างตะกร้า
    const handleClearCart = () => {
        setCartItems([]);
    };

    // ฟังก์ชันส่งคำขอยืม
    const handleBorrowSubmit = (borrowData: any) => {
        // เจ้าหน้าที่นอกแผนก - ส่งไปรออนุมัติจากแอดมิน
        const borrowRequest = {
            ...borrowData,
            borrowerType: "external" as const,
            userId: 3, // ID ของเจ้าหน้าที่นอกแผนก
            department: "ภายนอกกลุ่มงาน",
        };

        // สร้างคำขอยืมใหม่
        createNewBorrowRequest(borrowRequest);

        console.log("ส่งคำขอยืมครุภัณฑ์เรียบร้อยแล้ว:", borrowRequest);
    };

    // ฟังก์ชันสำหรับเมื่อส่งคำขอยืมเสร็จ
    const handleBorrowComplete = () => {
        // รีเฟรชข้อมูล
        updateEquipmentStatus();
        const updatedAvailableEquipment = [...inCPUData, ...outCPUData].filter(item => item.status === "ปกติ");
        setItems(updatedAvailableEquipment);

        alert("ส่งคำขอยืมครุภัณฑ์เรียบร้อยแล้ว! สถานะ: รออนุมัติจากแอดมิน");
    };

    // สำหรับเลือกหลายรายการ
    const handleSelectItem = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };
    const handleSelectAll = () => {
        if (selectedIds.length === currentItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(currentItems.map(item => item.id));
        }
    };
    const handleAddSelectedToCart = () => {
        const selectedItems = currentItems.filter(item => selectedIds.includes(item.id));
        selectedItems.forEach(item => handleAddToCart(item));
        setSelectedIds([]);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex gap-8">
            {/* Main Content */}
            <div className="flex-1">
                {/* Section: Table */}
                <section className="bg-white rounded-lg shadow border">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">รายการครุภัณฑ์ที่สามารถยืมได้ (เจ้าหน้าที่นอกแผนก)</h2>
                        <div className="flex items-center gap-4">
                            {/* Dropdown สำหรับหมวดหมู่ */}
                            <div className="relative">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="">ทุกหมวดหมู่</option>
                                    {equipmentCategories.map((category) => (
                                        <option key={category.id} value={category.label}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ค้นหาครุภัณฑ์"
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
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
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

                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse">
                            <thead className="bg-Pink text-White">
                                <tr>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium w-[40px]">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium w-[80px]">ลำดับ</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium w-[150px]">เลขครุภัณฑ์</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium">ชื่อครุภัณฑ์</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium w-[200px]">รายละเอียดครุภัณฑ์</th>
                                    <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium w-[120px]">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                            />
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{startIndex + index + 1}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.code}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.name}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">{item.details || item.category}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                                            >
                                                เพิ่มลงรายการ
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {currentItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="border border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                                            ไม่พบครุภัณฑ์ที่ว่าง
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* ปุ่มเพิ่มรายการที่เลือกลงตะกร้า */}
                    <div className="p-4">
                        <button
                            onClick={handleAddSelectedToCart}
                            disabled={selectedIds.length === 0}
                            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                        >
                            เพิ่มรายการที่เลือกลงตะกร้า
                        </button>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-sm text-gray-700">
                            แสดง {startIndex + 1} - {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
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
                </section>
            </div>

            {/* Cart Sidebar */}
            <div className="w-80">
                <BorrowCart
                    cartItems={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveFromCart}
                    onClearCart={handleClearCart}
                    borrowerType="external"
                    onBorrowSubmit={(borrowData) => {
                        handleBorrowSubmit(borrowData);
                        handleBorrowComplete();
                    }}
                />
            </div>

            {/* Undo Notification */}
            {recentlyRemoved && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
                    <span className="text-sm">
                        ลบ &ldquo;{recentlyRemoved.name}&rdquo; แล้ว
                    </span>
                    <button
                        onClick={handleUndoRemove}
                        className="bg-white text-green-500 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        เลิกทำ
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExternalBorrowPage;
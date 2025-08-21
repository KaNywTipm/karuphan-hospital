"use client";

import { useState } from "react";
import Image from "next/image";
import BorrowKaruphan from "@/components/modal/Borrow-karuphan";

interface CartItem {
    id: number;
    code: string;
    name: string;
    category: string;
    quantity: number;
}

interface BorrowCartProps {
    cartItems: CartItem[];
    onUpdateQuantity: (id: number, quantity: number) => void;
    onRemoveItem: (id: number) => void;
    onClearCart: () => void;
    borrowerType: "internal" | "external";
    onBorrowSubmit: (borrowData: any) => void;
}

const BorrowCart = ({
    cartItems,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    borrowerType,
    onBorrowSubmit
}: BorrowCartProps) => {
    const [showBorrowModal, setShowBorrowModal] = useState(false);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    const handleBorrowSubmit = (borrowData: any) => {
        // เรียกใช้ callback หลักที่ส่งมาจากหน้าหลัก
        onBorrowSubmit(borrowData);

        // ล้างตะกร้าหลังส่งคำขอเรียบร้อย
        onClearCart();
        setShowBorrowModal(false);
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow border p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        รายการการยืม
                    </h3>
                    <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
                        {totalItems} ชิ้น
                    </span>
                </div>

                {cartItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="mb-2">📦</div>
                        <p>ยังไม่มีครุภัณฑ์ในรายการยืม</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                            {cartItems.map((item) => (
                                <div key={item.id} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-sm text-gray-800 line-clamp-2">
                                                {item.name}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {item.code}
                                            </p>
                                            <p className="text-xs text-blue-600">
                                                {item.category}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700 ml-2"
                                        >
                                            <Image
                                                src="/delete.png"
                                                alt="remove"
                                                width={16}
                                                height={16}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">จำนวน:</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                                disabled={item.quantity <= 1}
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setShowBorrowModal(true)}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                                >
                                    ยืนยันการยืม
                                </button>
                                <button
                                    onClick={onClearCart}
                                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                                >
                                    ยกเลิกการยืม
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                รวม {totalItems} ชิ้น จาก {cartItems.length} รายการ
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Borrow Modal */}
            {showBorrowModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <BorrowKaruphan
                        selectedEquipment={null}
                        cartItems={cartItems}
                        onClose={() => setShowBorrowModal(false)}
                        onBorrow={(borrowData) => {
                            // ส่งข้อมูลการยืมทั้งหมดในตะกร้า
                            cartItems.forEach(item => {
                                // สร้างข้อมูลการยืมสำหรับแต่ละชิ้น
                                const itemBorrowData = {
                                    ...borrowData,
                                    equipmentCode: item.code,
                                    equipmentName: item.name,
                                    category: item.category,
                                    quantity: item.quantity,
                                    borrowerType,
                                };

                                // เรียกใช้ callback ที่ส่งมาจากหน้าหลัก
                                onBorrowSubmit(itemBorrowData);
                            });

                            // ล้างตะกร้าหลังส่งคำขอเรียบร้อย
                            onClearCart();
                            setShowBorrowModal(false);
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default BorrowCart;

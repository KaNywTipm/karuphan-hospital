"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// ใช้สำหรับ default value ให้ input type="date"
const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

type Me = {
    fullName: string;
    role: "ADMIN" | "INTERNAL" | "EXTERNAL";
    department?: { id: number; name: string } | null;
};

interface CartItem {
    id: number;
    code: string;
    name: string;
    category: string;
    quantity: number;
}

interface BorrowKaruphanProps {
    onClose?: () => void;
    onBorrow?: (borrowData: {
        returnDue: string;   // ควรเป็น YYYY-MM-DD
        reason: string;
        borrowerName?: string;
        department?: string | null;
    }) => void;
    selectedEquipment?: {
        id: number;
        code: string;
        name: string;
        category: string;
    } | null;
    cartItems?: CartItem[];
}

const BorrowKaruphan = ({ onClose, onBorrow, selectedEquipment, cartItems }: BorrowKaruphanProps) => {
    const [me, setMe] = useState<Me | null>(null);

    const [borrowDate] = useState<string>(toInputDate(new Date()));
    const [returnDate, setReturnDate] = useState<string>("");
    const [reason, setReason] = useState<string>("");

    async function fetchMe() {
        try {
            const r = await fetch(`/api/users/me?t=${Date.now()}`, { cache: "no-store" });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j?.ok && j.user) setMe(j.user as Me);
        } catch { }
    }

    useEffect(() => {
        fetchMe();
        const h = () => fetchMe(); // อัปเดตทันทีหลังผู้ใช้แก้โปรไฟล์
        window.addEventListener("me:updated", h);
        return () => window.removeEventListener("me:updated", h);
    }, []);

    const deptText =
        me?.department?.name ??
        (me?.role === "EXTERNAL" ? "บุคคลภายนอก" : "-");

    const handleClose = () => onClose?.();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!returnDate) return;

        // ส่งวันที่แบบ ค.ศ. ให้ API (YYYY-MM-DD)
        const payload = {
            returnDue: returnDate,
            reason: reason.trim(),
            borrowerName: me?.fullName,
            department: me?.department?.name ?? (me?.role === "EXTERNAL" ? "บุคคลภายนอก" : "-"),
        };

        onBorrow?.(payload);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-[90%] md:w-[600px] max-h-[90vh] overflow-y-auto">
                <div className="w-full flex justify-end mb-4">
                    <button onClick={handleClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>

                <div className="flex justify-center items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">รายการยืมที่ต้องการ</h2>
                </div>

                {/* ตารางแสดงรายการครุภัณฑ์ที่เลือก */}
                <div className="mb-6">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-red-300">
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ลำดับ</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ชื่อครุภัณฑ์</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ยี่ห้อ/รุ่น/แบบ</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">จำนวน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems && cartItems.length > 0 ? (
                                cartItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.name}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.category}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {selectedEquipment?.name || "ชื่อครุภัณฑ์"}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {selectedEquipment?.category || "ยี่ห้อ/รุ่น/แบบ"}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ฟอร์มหลัก */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="วันที่ยืม">
                        <input
                            type="date"
                            value={borrowDate}
                            readOnly
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-700"
                        />
                    </FormRow>

                    <FormRow label="กำหนดคืน">
                        <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-700"
                            required
                        />
                    </FormRow>

                    <FormRow label="เหตุผลที่ยืม">
                        <textarea
                            placeholder="ระบุเหตุผล"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="form-input border border-gray-300 rounded px-3 py-2 w-full min-h-[100px] resize-vertical"
                            required
                        />
                    </FormRow>

                    {/* แสดงชื่อผู้ยืม/กลุ่มงานจากบัญชีจริง */}
                    <FormRow label="ชื่อผู้ยืม">
                        <input
                            value={me?.fullName ?? "-"}
                            readOnly
                            className="form-input border border-gray-200 rounded px-3 py-2 w-full bg-gray-100 text-gray-700"
                        />
                    </FormRow>

                    <FormRow label="กลุ่มงาน">
                        <input
                            value={deptText}
                            readOnly
                            className="form-input border border-gray-200 rounded px-3 py-2 w-full bg-gray-100 text-gray-700"
                        />
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="submit"
                            className="bg-BlueLight hover:bg-teal-500 text-white px-6 py-2 rounded-md font-medium transition-colors"
                        >
                            บันทึก
                        </button>
                        <button
                            type="button"
                            className="bg-RedLight hover:bg-red-500 text-white px-6 py-2 rounded-md font-medium transition-colors"
                            onClick={handleClose}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <label className="w-32 font-medium text-gray-700 pt-2">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

export default BorrowKaruphan;

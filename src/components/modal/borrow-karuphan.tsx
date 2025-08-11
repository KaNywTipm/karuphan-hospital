"use client";

import { useState } from "react";
import Image from "next/image";

// ฟังก์ชันแปลงวันที่จากปีคริสต์ศักราชเป็นปีไทย (พ.ศ.)
const convertToThaiBuddhistDate = (date: Date): string => {
    const year = date.getFullYear() + 543; // เพิ่ม 543 เพื่อแปลงเป็น พ.ศ.
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
};

// ฟังก์ชันแปลงวันที่สำหรับ input type="date"
const convertDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface BorrowKaruphanProps {
    onClose?: () => void;
    onBorrow?: (borrowData: any) => void;
    selectedEquipment?: {
        id: number;
        code: string;
        name: string;
        category: string;
    } | null;
}

const BorrowKaruphan = ({ onClose, onBorrow, selectedEquipment }: BorrowKaruphanProps) => {
    const [borrowDate, setBorrowDate] = useState<string>(
        convertDateForInput(new Date())
    );
    const [returnDate, setReturnDate] = useState<string>('');

    const [formData, setFormData] = useState({
        equipmentCode: selectedEquipment?.code || '',
        equipmentName: selectedEquipment?.name || '',
        category: selectedEquipment?.category || '',
        quantity: '1',
        borrowerName: '',
        department: '',
        reason: '',
    });

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // สร้างข้อมูลการยืม
        const borrowData = {
            equipmentCode: formData.equipmentCode,
            equipmentName: formData.equipmentName,
            category: formData.category,
            quantity: parseInt(formData.quantity) || 1,
            borrowerName: formData.borrowerName,
            department: formData.department,
            borrowDate: convertToThaiBuddhistDate(new Date(borrowDate)),
            returnDate: returnDate ? convertToThaiBuddhistDate(new Date(returnDate)) : '',
            reason: formData.reason,
            borrowerType: 'internal', // จะถูกกำหนดใหม่ในหน้าที่เรียกใช้
            userId: 1, // จะถูกกำหนดใหม่ในหน้าที่เรียกใช้
        };

        if (onBorrow) {
            onBorrow(borrowData);
        }

        console.log('Borrow data:', borrowData);
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
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {formData.equipmentName || 'ชื่อครุภัณฑ์'}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {formData.category || 'ยี่ห้อ'}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {formData.quantity}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="วันที่ยืม">
                        <div className="relative w-full">
                            <input
                                type="date"
                                value={borrowDate}
                                onChange={(e) => setBorrowDate(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-700"
                                required
                            />
                        </div>
                    </FormRow>

                    <FormRow label="กำหนดคืน">
                        <div className="relative w-full">
                            <input
                                type="date"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-700"
                                required
                            />
                        </div>
                    </FormRow>

                    <FormRow label="เหตุผลยื่น">
                        <textarea
                            placeholder="ยืม"
                            value={formData.reason}
                            onChange={(e) => handleInputChange('reason', e.target.value)}
                            className="form-input border border-gray-300 rounded px-3 py-2 w-full min-h-[100px] resize-vertical"
                            required
                        />
                    </FormRow>

                    {/* ฟิลด์ซ่อนสำหรับข้อมูลครุภัณฑ์ */}
                    <input
                        type="hidden"
                        value={formData.equipmentCode}
                        onChange={(e) => handleInputChange('equipmentCode', e.target.value)}
                    />
                    <input
                        type="hidden"
                        value={formData.equipmentName}
                        onChange={(e) => handleInputChange('equipmentName', e.target.value)}
                    />
                    <input
                        type="hidden"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                    />

                    {/* ฟิลด์สำหรับข้อมูลผู้ยืม (จะถูกกรอกอัตโนมัติจากข้อมูลผู้ใช้) */}
                    <FormRow label="ชื่อผู้ยืม">
                        <input
                            placeholder="ชื่อผู้ยืม"
                            value={formData.borrowerName}
                            onChange={(e) => handleInputChange('borrowerName', e.target.value)}
                            className="form-input border border-gray-300 rounded px-3 py-2 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="แผนก/หน่วยงาน">
                        <input
                            placeholder="แผนก/หน่วยงาน"
                            value={formData.department}
                            onChange={(e) => handleInputChange('department', e.target.value)}
                            className="form-input border border-gray-300 rounded px-3 py-2 w-full"
                            required
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

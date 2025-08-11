"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import List from "@/components/dropdown/Category-karuphan";
import Status from "../dropdown/Status";

// ฟังก์ชันแปลงวันที่จากปีคริสต์ศักราชเป็นปีไทย (พ.ศ.)
const convertToThaiBuddhistDate = (date: Date): string => {
    const year = date.getFullYear() + 543; // เพิ่ม 543 เพื่อแปลงเป็น พ.ศ.
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface EditkaruphanProps {
    item?: any;
    onClose?: () => void;
    onUpdate?: (updatedItemData: any) => void;
}

const Editkaruphan = ({ item, onClose, onUpdate }: EditkaruphanProps) => {
    const [receivedDate, setReceivedDate] = useState<string>(
        convertToThaiBuddhistDate(new Date())
    );
    const [formData, setFormData] = useState({
        id: '',
        category: '',
        code: '',
        description: '',
        price: '',
        status: '',
    });

    useEffect(() => {
        if (item) {
            setFormData({
                id: item.id?.toString() || '',
                category: item.category || '',
                code: item.code || '',
                description: item.name || '',
                price: item.price?.toString() || '',
                status: item.status || '',
            });

            if (item.receivedDate) {
                // แปลงวันที่จาก yyyy-mm-dd เป็น Buddhist year format
                const [year, month, day] = item.receivedDate.split('-');
                const buddhistYear = parseInt(year) + 543;
                setReceivedDate(`${buddhistYear}-${month}-${day}`);
            }
        }
    }, [item]);

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
        // ที่นี่จะเป็นการบันทึกข้อมูลการแก้ไข
        const updatedItemData = {
            id: parseInt(formData.id),
            category: formData.category,
            code: formData.code,
            name: formData.description,
            price: parseFloat(formData.price.replace(/,/g, '')) || 0,
            receivedDate: receivedDate,
            status: formData.status,
            department: item?.department || 'ภายในกลุ่มงาน'
        };

        if (onUpdate) {
            onUpdate(updatedItemData);
        }

        console.log('Updated data:', updatedItemData);
        handleClose();
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-White p-8 rounded-2xl shadow-md w-[90%] md:w-[480px]">
                <div className="w-full flex justify-end">
                    <button onClick={handleClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">ฟอร์มแก้ไขข้อมูล</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="ลำดับ">
                        <input
                            readOnly
                            value={formData.id}
                            className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="หมวดหมู่">
                        <select
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            required
                        >
                            <option disabled value="">
                                หมวดหมู่ครุภัณฑ์
                            </option>
                            {List[0].items.map((item, index) => (
                                <option key={index} value={item.label}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </FormRow>

                    <FormRow label="ID">
                        <input
                            placeholder="12401"
                            value={formData.id}
                            onChange={(e) => handleInputChange('id', e.target.value)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="เลขครุภัณฑ์">
                        <input
                            placeholder="6530-008-0711/3"
                            value={formData.code}
                            onChange={(e) => handleInputChange('code', e.target.value)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="รายละเอียด">
                        <input
                            placeholder="เครื่องพ่นยา ฝ. ใส่แผน"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="ราคาเมื่อได้รับ">
                        <input
                            placeholder="60,000"
                            value={formData.price}
                            onChange={(e) => handleInputChange('price', e.target.value)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="วันที่ได้รับ">
                        <div className="relative w-full flex items-center">
                            <input
                                type="date"
                                value={receivedDate}
                                onChange={(e) => setReceivedDate(e.target.value)}
                                placeholder="2568-01-01"
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full pr-10"
                            />
                            <button type="button" className="absolute right-2">
                                <Image src="/datetime.png" alt="Datetime" width={20} height={20} />
                            </button>
                        </div>
                    </FormRow>


                    <FormRow label="สถานะ">
                        <select
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            required
                        >
                            <option disabled value="">
                                สถานะ
                            </option>
                            {Status[0].items.map((item, index) => (
                                <option key={index} value={item.label}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="submit"
                            className="bg-BlueLight hover:bg-[#70a8b6] text-White px-4 py-2 rounded-md"
                        >
                            บันทึกการแก้ไข
                        </button>
                        <button
                            type="button"
                            className="bg-RedLight hover:bg-red-600 text-White px-4 py-2 rounded-md"
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
    <div className="flex items-center gap-4">
        <label className="w-32 font-medium text-gray-700">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

export default Editkaruphan;

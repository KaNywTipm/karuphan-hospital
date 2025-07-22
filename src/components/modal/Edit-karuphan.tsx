"use client";

import { useState } from "react";
import Image from "next/image";
import List from "@/components/dropdown/Category-karuphan";
import Status from "../dropdown/Status";

const Editkaruphan = () => {
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-White p-8 rounded-2xl shadow-md w-[90%] md:w-[480px]">
                <div className="w-full flex justify-end">
                    <button onClick={handleClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">ฟอร์มเพิ่มข้อมูล</h2>
                </div>

                <form className="flex flex-col gap-4 text-sm">
                    <FormRow label="ลำดับ">
                        <input
                            readOnly
                            className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="หมวดหมู่">
                        <select className="form-input border border-gray-300 rounded px-2 py-1 w-full" defaultValue="">
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
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="ยี่ห้อ/รุ่น/แบบ">
                        <input
                            placeholder="เครื่องพ่นยา ฝ. ใส่แผน"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="เลขครุภัณฑ์">
                        <input
                            placeholder="6530-008-0711/3"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="ชื่อครุภัณฑ์">
                        <input
                            placeholder="เครื่องพ่นยา ฝ. ใส่แผน"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="ราคาเมื่อได้รับ">
                        <input
                            placeholder="60,000"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="วันที่ได้รับ">
                        <div className="relative w-full flex items-center">
                            <input
                                type="text"
                                placeholder="1997-11-22"
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            />
                            <button type="button" className="absolute right-2">
                                <Image src="/datetime.png" alt="Datetime" width={20} height={20} />
                            </button>
                        </div>
                    </FormRow>


                    <FormRow label="สถานะ">
                        <select className="form-input border border-gray-300 rounded px-2 py-1 w-full" defaultValue="">
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
                            เพิ่มข้อมูล
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

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import List from "@/components/dropdown/Unit"; 

type User = {
    id: number;
    fullName: string;
    role: string;
    phone: string;
};

type EditpersonnelProps = {
    onClose: () => void;
    onSave: (user: User) => void;
    user: User | undefined;
};

const Editpersonnel = ({ onClose, onSave, user }: EditpersonnelProps) => {
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("");
    const [phone, setPhone] = useState("");

    useEffect(() => {
        if (user) {
            setFullName(user.fullName);
            setRole(user.role);
            setPhone(user.phone);
        }
    }, [user]);

    if (!user) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: user.id,
            fullName,
            role,
            phone,
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black bg-opacity-30 fixed inset-0 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-[90%] md:w-[480px]">
                <div className="w-full flex justify-end">
                    <button onClick={onClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">ฟอร์มแก้ไขข้อมูล</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="ชื่อบัญชี">
                        <input
                            readOnly
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="บุคลากร">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        >
                            <option disabled value="">
                                หน่วยงาน
                            </option>
                            {List[0].items.map((item, index) => (
                                <option key={index} value={item.label}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </FormRow>

                    <FormRow label="ชื่อบุคลากร">
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="ชื่อบุคลากร"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="เบอร์โทร">
                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="เบอร์โทร"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="submit"
                            className="bg-BlueLight hover:bg-[#70a8b6] text-White px-4 py-2 rounded-md"
                        >
                            บันทึก
                        </button>
                        <button
                            type="button"
                            className="bg-RedLight hover:bg-red-600 text-White px-4 py-2 rounded-md"
                            onClick={onClose}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormRow = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="flex items-center gap-4">
        <label className="w-32 font-medium text-gray-700">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

export default Editpersonnel;

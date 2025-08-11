"use client";

import { useState, useEffect } from "react";
import List from "@/components/dropdown/Unit";

type User = {
    id: number;
    username: string;
    fullName: string;
    role: string;
    phone: string;
};

const UserEditProfile = () => {
    // Mock data - ในอนาคตจะดึงข้อมูลจาก API
    const [userData, setUserData] = useState<User>({
        id: 1,
        username: "username1",
        fullName: "นางสาว************",
        role: "บุคลากรภายในกลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
        phone: "012-***-****"
    });

    const [formData, setFormData] = useState({
        username: "",
        fullName: "",
        role: "",
        phone: ""
    });

    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // โหลดข้อมูลผู้ใช้
        setFormData({
            username: userData.username,
            fullName: userData.fullName,
            role: userData.role,
            phone: userData.phone
        });
    }, [userData]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // ในอนาคตจะส่งข้อมูลไปยัง API
            setUserData(prev => ({
                ...prev,
                ...formData
            }));
            setIsEditing(false);
            alert("บันทึกข้อมูลเรียบร้อยแล้ว");
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };

    const handleCancel = () => {
        setFormData({
            username: userData.username,
            fullName: userData.fullName,
            role: userData.role,
            phone: userData.phone
        });
        setIsEditing(false);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">ข้อมูลบุคลากร</h1>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-BlueLight hover:bg-[#70a8b6] text-white px-6 py-2 rounded-md transition-colors"
                        >
                            แก้ไขข้อมูล
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ชื่อบัญชี */}
                        <FormField
                            label="ชื่อบัญชี"
                            isEditing={isEditing}
                            value={formData.username}
                            onChange={(value) => handleInputChange('username', value)}
                            placeholder="ชื่อบัญชี"
                            disabled={true} // ชื่อบัญชีไม่สามารถแก้ไขได้
                        />

                        {/* บุคลากร */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                บุคลากร
                            </label>
                            {isEditing ? (
                                <select
                                    value={formData.role}
                                    onChange={(e) => handleInputChange('role', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-BlueLight focus:border-transparent"
                                    required
                                >
                                    <option value="">เลือกหน่วยงาน</option>
                                    {List[0].items.map((item, index) => (
                                        <option key={index} value={item.label}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                                    {formData.role || "ไม่ระบุ"}
                                </div>
                            )}
                        </div>

                        {/* ชื่อบุคลากร */}
                        <FormField
                            label="ชื่อบุคลากร"
                            isEditing={isEditing}
                            value={formData.fullName}
                            onChange={(value) => handleInputChange('fullName', value)}
                            placeholder="ชื่อบุคลากร"
                            required
                        />

                        {/* เบอร์โทร */}
                        <FormField
                            label="เบอร์โทร"
                            isEditing={isEditing}
                            value={formData.phone}
                            onChange={(value) => handleInputChange('phone', value)}
                            placeholder="เบอร์โทร"
                            required
                        />
                    </div>

                    {isEditing && (
                        <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="submit"
                                className="bg-BlueLight hover:bg-[#70a8b6] text-white px-8 py-2 rounded-md transition-colors"
                            >
                                บันทึก
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="bg-RedLight hover:bg-red-600 text-white px-8 py-2 rounded-md transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

// Component สำหรับฟิลด์ฟอร์ม
const FormField = ({
    label,
    isEditing,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
}: {
    label: string;
    isEditing: boolean;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {isEditing && !disabled ? (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-BlueLight focus:border-transparent"
                required={required}
            />
        ) : (
            <div className={`w-full px-3 py-2 border rounded-md ${disabled ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                {value || "ไม่ระบุ"}
            </div>
        )}
    </div>
);

export default UserEditProfile;
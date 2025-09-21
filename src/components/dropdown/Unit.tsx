"use client";

import { useState } from "react";

// ข้อมูลกลุ่มงานทั้งหมด
export const allUnits = [
    { id: 1, label: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม" },
    { id: 2, label: "กลุ่มงานบริหารทั่วไป" },
    { id: 3, label: "กลุ่มงานเทคนิคการแพทย์" },
    { id: 4, label: "กลุ่มงานทันตกรรม" },
    { id: 5, label: "กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค" },
    { id: 6, label: "กลุ่มงานการแพทย์" },
    { id: 7, label: "กลุ่มงานโภชนศาสตร์" },
    { id: 8, label: "กลุ่มงานรังสีวิทยา" },
    { id: 9, label: "กลุ่มงานเวชกรรมฟื้นฟู" },
    { id: 10, label: "กลุ่มงานประกันสุขภาพ ยุทธศาสตร์ และสารสนเทศทางการแพทย์" },
    { id: 11, label: "กลุ่มงานการพยาบาล" },
    { id: 12, label: "กลุ่มงานแพทย์แผนไทยและการแพทย์ทางเลือก" },
    { id: 13, label: "กลุ่มงานสุขภาพจิตและยาเสพติด" },
];

// คอมโพเนนต์ Dropdown สำหรับกรองกลุ่มงาน
interface UnitFilterDropdownProps {
    selectedUnit: string;
    onUnitChange: (unit: string) => void;
    placeholder?: string;
    showAllOption?: boolean;
    className?: string;
}

export function UnitFilterDropdown({
    selectedUnit,
    onUnitChange,
    placeholder = "เลือกกลุ่มงาน",
    showAllOption = true,
    className = "",
}: UnitFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (unit: string) => {
        onUnitChange(unit);
        setIsOpen(false);
    };

    const getDisplayText = () => {
        if (!selectedUnit && showAllOption) return "ทุกกลุ่มงาน";
        if (!selectedUnit) return placeholder;

        const unit = allUnits.find(u => u.id.toString() === selectedUnit || u.label === selectedUnit);
        return unit ? unit.label : selectedUnit;
    };

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
            >
                <span className="block truncate">{getDisplayText()}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {showAllOption && (
                        <button
                            type="button"
                            onClick={() => handleSelect("")}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${!selectedUnit ? "bg-blue-50 text-blue-600" : ""
                                }`}
                        >
                            ทุกกลุ่มงาน
                        </button>
                    )}

                    {allUnits.map((unit) => (
                        <button
                            key={unit.id}
                            type="button"
                            onClick={() => handleSelect(unit.id.toString())}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${selectedUnit === unit.id.toString() || selectedUnit === unit.label
                                    ? "bg-blue-50 text-blue-600"
                                    : ""
                                }`}
                        >
                            <span className="block truncate">{unit.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Hook สำหรับการกรองข้อมูลตามกลุ่มงาน
export function useUnitFilter<T extends { departmentId?: number | null; department?: { name?: string } }>(
    data: T[],
    selectedUnit: string
) {
    if (!selectedUnit) return data;

    const selectedUnitData = allUnits.find(u => u.id.toString() === selectedUnit);
    if (!selectedUnitData) return data;

    return data.filter(item => {
        if (item.department?.name === selectedUnitData.label) return true;
        if (item.departmentId?.toString() === selectedUnit) return true;
        return false;
    });
}

const Unit = [
    {
        items: allUnits.map(unit => ({ label: unit.label })),
    },
];

// ฟังก์ชันสำหรับแสดงชื่อหน่วยงานตาม role
export const displayUnitLabel = (role: string) => {
    switch (role) {
        case "admin":
            return "ผู้ดูแลระบบ";
        case "internal":
            return "บุคลากรภายใน";
        case "external":
            return "บุคลากรภายนอก";
        default:
            return "ไม่ระบุ";
    }
};

export default Unit;
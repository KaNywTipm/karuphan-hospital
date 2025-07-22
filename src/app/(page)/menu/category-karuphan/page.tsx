"use client";

import { useState } from "react";
import Image from "next/image";
import List from "@/components/dropdown/Category-karuphan";

const itemsPerPage = 5;

const CategoryKaruphan = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isOpen, setIsOpen] = useState(true);

    const filteredData = List[0].items.filter((item) =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);
    const allItems = List[0].items;
    const nextIndex = allItems.length + 1;


    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    if (!isOpen) return null;

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
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            />
                        </div>
                        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                            <Image src="/HamBmenu.png" alt="menu" width={20} height={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-red-400 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium">ลำดับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อหมวดหมู่ครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">แก้ไข</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ลบ</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200">
                            {currentItems.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.label}</td>
                                    <td className="px-4 py-3">
                                        <button className="bg-Yellow text-White px-3 py-1 rounded text-sm">
                                            <Image src="/edit.png" alt="edit" width={20} height={20} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="bg-RedLight text-White px-3 py-1 rounded text-sm">
                                            <Image src="/delete.png" alt="delete" width={20} height={20} />
                                        </button>
                                    </td>

                                </tr>
                            ))}
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ไม่พบหมวดหมู่ที่ค้นหา
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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

            {/* Section: Add Form */}
            <section className="bg-White rounded-lg shadow border p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">เพิ่มหมวดหมู่ครุภัณฑ์</h2>
                <form className="flex flex-col gap-4">
                    <FormRow label="ลำดับ">
                        <input
                            readOnly
                            value={nextIndex}
                            className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>


                    <FormRow label="ชื่อหมวดหมู่ครุภัณฑ์">
                        <input
                            placeholder="ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-4">
                        <button
                            type="submit"
                            className="bg-Blue text-White px-4 py-2 rounded-md"
                        >
                            เพิ่มข้อมูล
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-4">
        <label className="w-40 font-medium text-gray-700">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

export default CategoryKaruphan;

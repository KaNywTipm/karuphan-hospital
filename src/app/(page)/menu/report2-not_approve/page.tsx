"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { borrowReturnData, BorrowReturn, equipmentCategories } from '@/lib/data';

export default function NotApproveReport() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [filteredData, setFilteredData] = useState<BorrowReturn[]>([]);

    // Filter data to show only "ไม่อนุมัติ" status items
    useEffect(() => {
        let filtered = borrowReturnData.filter((item: BorrowReturn) =>
            item.status === "ไม่อนุมัติ"
        );

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.equipmentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategory) {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        setFilteredData(filtered);
    }, [searchTerm, selectedCategory]);

    // Function to handle Excel export
    const handleExcelExport = () => {
        // สร้าง CSV data สำหรับการส่งออก
        const headers = ['ลำดับ', 'ผู้ยืม', 'หน่วยงาน', 'เลขครุภัณฑ์', 'ชื่อครุภัณฑ์', 'หมวดหมู่', 'วันที่ยืม', 'เหตุผลการยืม', 'สถานะ'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map((item, index) => [
                index + 1,
                `"${item.borrowerName}"`,
                `"${item.department}"`,
                item.equipmentCode,
                `"${item.equipmentName}"`,
                `"${item.category}"`,
                item.borrowDate || '-',
                `"${item.reason}"`,
                `"${item.status}"`
            ].join(','))
        ].join('\n');

        // สร้างไฟล์และดาวน์โหลด
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `รายงานครุภัณฑ์ที่ถูกยกเลิก_${new Date().toLocaleDateString('th-TH')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-NavyBlue">รายงานครุภัณฑ์ที่ถูกยกเลิก/ไม่อนุมัติ</h1>

                {/* Export Excel Button */}
                <button
                    onClick={handleExcelExport}
                    className="bg-Green text-White px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors"
                >
                    <span>ดาวน์โหลด Excel</span>
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex justify-between items-center gap-4">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-NavyBlue">หมวดหมู่:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                    >
                        <option value="">ทั้งหมด</option>
                        {equipmentCategories.map((category) => (
                            <option key={category.id} value={category.label}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-80">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-Grey rounded-lg focus:outline-none focus:ring-2 focus:ring-Blue"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Image
                            src="/search.png"
                            alt="search"
                            width={20}
                            height={20}
                            className="opacity-50"
                        />
                    </div>
                </div>
            </div>


            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-White">
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ผู้ยืม</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">หน่วยงาน</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">วันที่ยืม</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">เหตุผลการยืม</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((item: BorrowReturn, index: number) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-3 text-center">{index + 1}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.borrowerName}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.department}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.equipmentCode}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.equipmentName}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.borrowDate || '-'}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.reason}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">
                                        <span className="px-2 py-1 rounded-full text-xs bg-RedLight text-White">
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                                    ไม่พบข้อมูลครุภัณฑ์ที่ถูกยกเลิก/ไม่อนุมัติ
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                        แสดง {filteredData.length} รายการ จากทั้งหมด {borrowReturnData.filter(item => item.status === "ไม่อนุมัติ").length} รายการ
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        disabled={true}
                    >
                        ← Previous
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center bg-NavyBlue text-white rounded text-sm">
                        1
                    </button>
                    <button
                        className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        disabled={true}
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}

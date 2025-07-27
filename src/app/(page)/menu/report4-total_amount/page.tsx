"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { inCPUData, outCPUData, equipmentCategories } from '@/lib/data';

// Combine all equipment data
interface Equipment {
    id: number;
    code: string;
    name: string;
    category: string;
    department: string;
    receivedDate: string;
    price: number;
    status: string;
}

export default function TotalAmountReport() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [filteredData, setFilteredData] = useState<Equipment[]>([]);
    const [allEquipmentData, setAllEquipmentData] = useState<Equipment[]>([]);

    // Combine all equipment data on component mount
    useEffect(() => {
        const combinedData = [...inCPUData, ...outCPUData];
        setAllEquipmentData(combinedData);
        setFilteredData(combinedData);
    }, []);

    // Filter data based on search term and category
    useEffect(() => {
        let filtered = allEquipmentData;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategory) {
            filtered = filtered.filter(item => item.category.includes(selectedCategory));
        }

        setFilteredData(filtered);
    }, [searchTerm, selectedCategory, allEquipmentData]);

    // Calculate total amount
    const totalAmount = filteredData.reduce((sum, item) => sum + item.price, 0);
    const totalItems = filteredData.length;

    // Function to format currency
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    // Function to handle Excel export
    const handleExcelExport = () => {
        const headers = ['ลำดับ', 'เลขครุภัณฑ์', 'ชื่อครุภัณฑ์', 'วันที่ได้รับ', 'ราคาเมื่อได้รับ'];

        const csvContent = [
            headers.join(','),
            ...filteredData.map((item, index) => [
                index + 1,
                item.code,
                `"${item.name}"`,
                item.receivedDate,
                item.price
            ].join(','))
        ].join('\n');

        // Add summary at the end
        const summaryContent = `\n\n"รายการครุภัณฑ์ของเงินงาน \\"120-PCU\\" รวมทั้งสิ้น ${totalItems} รายชิ้น",,,,"${formatCurrency(totalAmount)} บาท"`;

        const blob = new Blob(['\ufeff' + csvContent + summaryContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `สรุปยอดครุภัณฑ์_${new Date().toLocaleDateString('th-TH')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-White rounded-lg shadow-sm p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-NavyBlue">สรุปยอดครุภัณฑ์</h1>

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

            {/* Summary Stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-Blue bg-opacity-10 border border-Blue rounded-lg p-4">
                    <div className="text-lg font-semibold text-Blue">จำนวนครุภัณฑ์ทั้งหมด</div>
                    <div className="text-3xl font-bold text-Blue">{totalItems.toLocaleString()} รายการ</div>
                </div>
                <div className="bg-Green bg-opacity-10 border border-Green rounded-lg p-4">
                    <div className="text-lg font-semibold text-Green">มูลค่ารวมทั้งหมด</div>
                    <div className="text-3xl font-bold text-Green">{formatCurrency(totalAmount)} บาท</div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-Pink text-NavyBlue">
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ลำดับ</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">เลขครุภัณฑ์</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ชื่อครุภัณฑ์</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">วันที่ได้รับ</th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-medium">ราคาเดิมดั้งเดิม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((item: Equipment, index: number) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-3 text-center">{index + 1}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.code}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.name}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{item.receivedDate}</td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">{formatCurrency(item.price)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                                    ไม่พบข้อมูลครุภัณฑ์
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center bg-Blue bg-opacity-5 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-NavyBlue">
                        รายการครุภัณฑ์ของกลุ่มงาน &quot;120-PCU&quot; รวมทั้งสิ้น {totalItems} รายชิ้น
                    </div>
                    <div className="text-xl font-bold text-Blue">
                        {formatCurrency(totalAmount)} บาท
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t mt-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                        แสดง {filteredData.length} รายการ จากทั้งหมด {allEquipmentData.length} รายการ
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
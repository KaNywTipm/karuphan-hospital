"use client";
import React, { useState } from 'react';
import Image from 'next/image';

// ข้อมูลจำลองสำหรับสถานะการยืมของผู้ใช้ภายนอก
const externalBorrowData = [
    {
        id: 1,
        borrowDate: '03/01/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'รออนุมัติ',
        reason: 'กล่องเก็บการ์ด'
    },
    {
        id: 2,
        borrowDate: '29/02/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'อนุมัติ',
        reason: 'กล่องเก็บการ์ด'
    },
    {
        id: 3,
        borrowDate: '02/03/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'อนุมัติ',
        reason: 'กล่องเก็บการ์ด'
    },
    {
        id: 4,
        borrowDate: '30/03/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'ไม่อนุมัติ',
        reason: ''
    },
    {
        id: 5,
        borrowDate: '14/03/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'รออนุมัติ',
        reason: ''
    },
    {
        id: 6,
        borrowDate: '30/03/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'ไม่อนุมัติ',
        reason: ''
    },
    {
        id: 7,
        borrowDate: '30/03/2025',
        returnDate: '-',
        borrowerName: 'นายพิสิฐ',
        equipmentName: 'ชื่อครุภัณฑ์',
        status: 'ไม่อนุมัติ',
        reason: ''
    },
];

export default function UserExternalStatusBorrow() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // ฟิลเตอร์ข้อมูลตามการค้นหา
    const filteredData = externalBorrowData.filter(item =>
        item.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // คำนวณข้อมูลสำหรับหน้าปัจจุบัน
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'อนุมัติ':
                return 'bg-green-100 text-green-800';
            case 'ไม่อนุมัติ':
                return 'bg-red-100 text-red-800';
            case 'รออนุมัติ':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            {/* Section: Table */}
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">สถานะการยืมครุภัณฑ์</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาสถานะการยืม"
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
                    <table className="w-full table-fixed">
                        <thead className="bg-Pink text-White">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[80px]">ลำดับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">วันที่ยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">กำหนดคืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">ผู้อนุมัติยืม/คืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">เหตุผลที่ยืม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentData.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.borrowDate}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.returnDate}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.borrowerName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.equipmentName}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBgColor(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.reason}</td>
                                </tr>
                            ))}

                            {currentData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ไม่พบข้อมูลที่ค้นหา
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-gray-700">
                        แสดง {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} จาก {filteredData.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            disabled={currentPage === 1}
                        >
                            ← Previous
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                            {currentPage}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
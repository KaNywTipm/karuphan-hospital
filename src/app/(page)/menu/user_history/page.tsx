"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { borrowReturnData, currentUser, type BorrowReturn } from '@/lib/data';

// ข้อมูลประวัติการยืมจาก data.ts
const historyData = borrowReturnData;

export default function UserHistory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // ฟิลเตอร์ข้อมูลตามการค้นหา
    const filteredData = historyData.filter((item: BorrowReturn) =>
        item.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // คำนวณข้อมูลสำหรับหน้าปัจจุบัน
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'อนุมัติแล้ว/รอคืน':
            case 'คืนแล้ว':
                return 'text-green-600';
            case 'ไม่อนุมัติ':
                return 'text-red-600';
            case 'รออนุมัติ':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'อนุมัติแล้ว/รอคืน':
                return 'bg-orange-100 text-orange-800';
            case 'คืนแล้ว':
                return 'bg-green-100 text-green-800';
            case 'ไม่อนุมัติ':
                return 'bg-red-100 text-red-800';
            case 'รออนุมัติ':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'อนุมัติแล้ว/รอคืน':
                return 'อนุมัติ';
            case 'คืนแล้ว':
                return 'คืนแล้ว';
            case 'ไม่อนุมัติ':
                return 'ไม่อนุมัติ';
            case 'รออนุมัติ':
                return 'รออนุมัติ';
            default:
                return status;
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            {/* Section: Table */}
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">ประวัติการยืมครุภัณฑ์</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาประวัติการยืม"
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
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">กำหนดยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">วันที่คืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">ผู้ยืมอีกนิด/ส่วน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">สถานะ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">เหตุผลที่ยืม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentData.map((item: BorrowReturn, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.borrowDate || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.actualReturnDate || item.returnDate || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.borrowerName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.equipmentName}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBgColor(item.status)}`}>
                                            {getStatusText(item.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.reason}</td>
                                </tr>
                            ))}

                            {currentData.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ไม่พบประวัติการยืมที่ค้นหา
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
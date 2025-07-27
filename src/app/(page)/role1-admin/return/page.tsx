'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { borrowReturnData, updateReturnInfo, type BorrowReturn } from '@/lib/data';
import Status from '@/components/dropdown/Status';

// ฟังก์ชันแปลงวันที่จากปีคริสต์ศักราชเป็นปีไทย (พ.ศ.)
const convertToThaiBuddhistDate = (date: Date): string => {
    const year = date.getFullYear() + 543; // เพิ่ม 543 เพื่อแปลงเป็น พ.ศ.
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ฟังก์ชันแปลงวันที่จากปีไทย (พ.ศ.) เป็นปีคริสต์ศักราช
const convertFromThaiBuddhistDate = (thaiBuddhistDate: string): string => {
    if (!thaiBuddhistDate) return '';
    const parts = thaiBuddhistDate.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0]) - 543; // ลบ 543 เพื่อแปลงเป็น ค.ศ.
        return `${year}-${parts[1]}-${parts[2]}`;
    }
    return thaiBuddhistDate;
};

const ReturnPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [borrowRequest, setBorrowRequest] = useState<BorrowReturn | null>(null);
    const [returnCondition, setReturnCondition] = useState<string>('');
    const [returnNotes, setReturnNotes] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<any>(null);
    const [actualReturnDate, setActualReturnDate] = useState<string>(
        convertToThaiBuddhistDate(new Date())
    );

    useEffect(() => {
        // ดึงข้อมูลจาก URL params
        const requestId = searchParams.get('id');
        if (requestId) {
            // ค้นหาข้อมูลจาก borrowReturnData
            const request = borrowReturnData.find(item => item.id === parseInt(requestId));
            if (request) {
                setBorrowRequest(request);
            }
        }
    }, [searchParams]);

    const handleReturn = () => {
        if (borrowRequest && selectedStatus) {
            // แปลงวันที่กลับเป็นปีคริสต์ศักราชก่อนบันทึก
            const christianDate = convertFromThaiBuddhistDate(actualReturnDate);

            // บันทึกข้อมูลการคืนพร้อมสภาพครุภัณฑ์
            const updatedRequest = updateReturnInfo(borrowRequest.id, {
                returnCondition: selectedStatus.label as BorrowReturn['returnCondition'],
                returnNotes: returnNotes,
                actualReturnDate: christianDate,
                receivedBy: 'บางจิน รอดรวง'
            });

            if (updatedRequest) {
                console.log('Item returned:', updatedRequest);
                console.log('Return condition:', selectedStatus.label);
                console.log('Return notes:', returnNotes);

                // กลับไปหน้า role1-admin และไปที่ tab "คืนแล้ว"
                router.push('/role1-admin');
            }
        }
    };

    const handleCancel = () => {
        router.push('/role1-admin');
    };

    if (!borrowRequest) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gray-300 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800">
                    รายการยืมครุภัณฑ์-ผู้ดูแลระบบครุภัณฑ์
                </h1>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    {/* Form Header */}
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            รายการยืมรอคืน
                        </h2>

                        {/* Equipment Table */}
                        <div className="mb-6">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-red-300">
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            ลำดับ
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            ชื่อครุภัณฑ์
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            กำหนดคืน
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            สภาพ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                            1
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                            {borrowRequest.category}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                            {borrowRequest.returnDate}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                            {/* Status Dropdown */}
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={selectedStatus?.id || ''}
                                                onChange={(e) => {
                                                    const statusId = parseInt(e.target.value);
                                                    const status = Status[0].items.find(item => item.id === statusId);
                                                    setSelectedStatus(status);
                                                }}
                                            >
                                                <option value="">เลือกสภาพ</option>
                                                {Status[0].items.map((status) => (
                                                    <option key={status.id} value={status.id}>
                                                        {status.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Return Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        วันที่ยืม {borrowRequest.borrowDate || 'ไม่ระบุ'}
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        กำหนดคืน {borrowRequest.returnDate}
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        บุคลากร {borrowRequest.department}
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ผู้ยืม {borrowRequest.borrowerName}
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        เหตุผลที่ยืม {borrowRequest.reason}
                                    </label>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        วันที่คืน
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={actualReturnDate}
                                        onChange={(e) => setActualReturnDate(e.target.value)}
                                        placeholder="2568-01-01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        เหตุผลคืน
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder="ระบุเหตุผลหรือหมายเหตุ..."
                                        value={returnNotes}
                                        onChange={(e) => setReturnNotes(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ผู้รับคืน
                                    </label>
                                    <div className="bg-gray-200 rounded px-3 py-2 text-sm text-gray-700">
                                        บางจิน รอดรวง
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-start gap-4">
                            <button
                                onClick={handleReturn}
                                disabled={!selectedStatus}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedStatus
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                บันทึก
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnPage;

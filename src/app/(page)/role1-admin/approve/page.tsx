'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { borrowReturnData, updateBorrowStatus, type BorrowReturn } from '@/lib/data';

interface BorrowRequest {
    id: number;
    borrowerName: string;
    borrowerType: 'internal' | 'external';
    department: string;
    equipmentCode: string;
    category: string;
    borrowDate?: string;
    returnDate: string;
    reason: string;
    status: string;
}

const ApprovePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(null);
    const [approvalReason, setApprovalReason] = useState('');

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

    const handleApprove = () => {
        if (borrowRequest) {
            // อัปเดตสถานะเป็น "อนุมัติแล้ว/รอคืน"
            const updatedRequest = updateBorrowStatus(borrowRequest.id, 'อนุมัติแล้ว/รอคืน');
            if (updatedRequest) {
                console.log('Request approved:', updatedRequest);
                // กลับไปหน้า role1-admin และไปที่ tab "อนุมัติแล้ว/รอคืน"
                router.push('/role1-admin');
            }
        }
    };

    const handleReject = () => {
        if (borrowRequest) {
            // อัปเดตสถานะเป็น "ไม่อนุมัติ"
            const updatedRequest = updateBorrowStatus(borrowRequest.id, 'ไม่อนุมัติ');
            if (updatedRequest) {
                console.log('Request rejected:', updatedRequest);
                console.log('Rejection reason:', approvalReason);
                // กลับไปหน้า role1-admin และไปที่ tab "ไม่อนุมัติ/ยกเลิก"
                router.push('/role1-admin');
            }
        }
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
                    รายการที่ต้องอนุมัติ-ผู้ดูแลระบบครุภัณฑ์
                </h1>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    {/* Form Header */}
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            รายการยืมที่ต้องการ
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
                                            วันที่ยืม
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            จำนวน
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
                                            {borrowRequest.borrowDate || 'ไม่ระบุ'}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                            1
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Borrower Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Left Column */}
                            <div className="space-y-4">
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
                                        เบอร์ครุภัณฑ์ {borrowRequest.equipmentCode}
                                    </label>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        กำหนดคืน
                                    </label>
                                    <div className="bg-gray-200 rounded px-3 py-2 text-sm text-gray-700">
                                        {borrowRequest.returnDate}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        เหตุผลที่ยืม
                                    </label>
                                    <div className="bg-gray-200 rounded px-3 py-2 h-20 text-sm text-gray-700">
                                        {borrowRequest.reason}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-start gap-4">
                            <button
                                onClick={handleApprove}
                                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                อนุมัติ
                            </button>
                            <button
                                onClick={handleReject}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                ไม่อนุมัติ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApprovePage;
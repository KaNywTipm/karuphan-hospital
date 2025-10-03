"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

type ExpiredRequest = {
    id: number;
    externalName: string;
    externalDept: string;
    externalPhone: string;
    createdAt: string;
    daysOverdue: number;
    itemCount: number;
    items: Array<{
        equipmentCode: string;
        equipmentName: string;
        quantity: number;
    }>;
};

export default function AutoRejectPage() {
    const [expiredRequests, setExpiredRequests] = useState<ExpiredRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [lastProcessResult, setLastProcessResult] = useState<any>(null);

    // โหลดรายการคำขอที่เกินกำหนด
    const loadExpiredRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/borrow/auto-reject");
            const json = await res.json();
            if (json.ok) {
                setExpiredRequests(json.data || []);
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (error) {
            console.error("Failed to load expired requests:", error);
            alert("ไม่สามารถโหลดข้อมูลได้");
        } finally {
            setLoading(false);
        }
    };

    // ประมวลผลปรับสถานะเป็น REJECTED
    const processAutoReject = async () => {
        if (!confirm(`ต้องการปรับสถานะคำขอที่เกินกำหนด ${expiredRequests.length} รายการเป็น "ไม่อนุมัติ" หรือไม่?`)) {
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/borrow/auto-reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const json = await res.json();

            if (json.ok) {
                setLastProcessResult(json);
                alert(`ปรับสถานะเรียบร้อยแล้ว: ${json.message}`);
                // โหลดข้อมูลใหม่
                await loadExpiredRequests();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (error) {
            console.error("Failed to process auto-reject:", error);
            alert("ไม่สามารถปรับสถานะได้");
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        loadExpiredRequests();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image src="/icons/status.png" alt="Status" width={32} height={32} />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                จัดการคำขอยืมที่เกินกำหนด
                            </h1>
                            <p className="text-gray-600 text-sm">
                                คำขอยืมภายนอกที่ส่งมาเกิน 3 วันแต่ยังไม่ได้อนุมัติ
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={loadExpiredRequests}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Image src="/icons/search.png" alt="Refresh" width={16} height={16} />
                            {loading ? "กำลังโหลด..." : "รีเฟรช"}
                        </button>
                        {expiredRequests.length > 0 && (
                            <button
                                onClick={processAutoReject}
                                disabled={processing}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Image src="/icons/delete.png" alt="Reject" width={16} height={16} />
                                {processing ? "กำลังประมวลผล..." : `ปรับสถานะ ${expiredRequests.length} รายการ`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* สถิติ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Image src="/icons/status.png" alt="Pending" width={24} height={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">คำขอที่เกินกำหนด</p>
                            <p className="text-2xl font-bold text-yellow-600">{expiredRequests.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Image src="/icons/datetime.png" alt="Days" width={24} height={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">วันที่เกินมากสุด</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {expiredRequests.length > 0 ? Math.max(...expiredRequests.map(r => r.daysOverdue)) : 0} วัน
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Image src="/icons/cart.png" alt="Items" width={24} height={24} />
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">รายการอุปกรณ์รวม</p>
                            <p className="text-2xl font-bold text-green-600">
                                {expiredRequests.reduce((sum, r) => sum + r.itemCount, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ผลลัพธ์การประมวลผลล่าสุด */}
            {lastProcessResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-green-800 mb-2">ผลลัพธ์การประมวลผลล่าสุด</h3>
                    <p className="text-green-700">{lastProcessResult.message}</p>
                    <p className="text-sm text-green-600">
                        ประมวลผลสำเร็จ: {lastProcessResult.processed} รายการ
                    </p>
                </div>
            )}

            {/* รายการคำขอที่เกินกำหนด */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">
                        รายการคำขอยืมที่เกินกำหนด ({expiredRequests.length} รายการ)
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : expiredRequests.length === 0 ? (
                    <div className="p-8 text-center">
                        <Image src="/icons/status.png" alt="No data" width={48} height={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-gray-600">ไม่พบคำขอยืมที่เกินกำหนด</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ผู้ขอยืม
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        วันที่ส่งคำขอ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        เกินกำหนด
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        รายการอุปกรณ์
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        จำนวน
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {expiredRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {request.externalName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {request.externalDept}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {request.externalPhone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(request.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                {request.daysOverdue} วัน
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {request.items.slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="text-sm text-gray-900">
                                                        <span className="font-medium">{item.equipmentCode}</span> - {item.equipmentName}
                                                    </div>
                                                ))}
                                                {request.items.length > 3 && (
                                                    <div className="text-sm text-gray-500">
                                                        และอีก {request.items.length - 3} รายการ
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.itemCount} รายการ
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
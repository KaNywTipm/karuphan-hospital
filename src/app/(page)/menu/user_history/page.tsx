"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Status = "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";

type HistoryItem = {
    id: number;
    borrowDate: string | null;
    returnDue: string | null;
    actualReturnDate: string | null;
    status: Status;
    reason: string;
    equipmentName: string;
    equipmentCode: string;
    returnCondition: string | null;
    returnNotes: string | null;
};

export default function UserHistory() {
    const [data, setData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const STATUS_TEXT = {
        PENDING: "รออนุมัติ",
        APPROVED: "อนุมัติแล้ว/รอคืน",
        RETURNED: "คืนแล้ว",
        REJECTED: "ไม่อนุมัติ"
    };

    const STATUS_COLOR = {
        PENDING: "bg-blue-100 text-blue-800",
        APPROVED: "bg-orange-100 text-orange-800",
        RETURNED: "bg-green-100 text-green-800",
        REJECTED: "bg-red-100 text-red-800"
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        try {
            return new Date(dateStr).toLocaleDateString("th-TH");
        } catch {
            return "-";
        }
    };

    const getConditionText = (condition: string | null) => {
        if (!condition) return "-";
        switch (condition) {
            case "NORMAL": return "ปกติ";
            case "BROKEN": return "ชำรุด";
            case "LOST": return "สูญหาย";
            case "WAIT_DISPOSE": return "รอจำหน่าย";
            case "DISPOSED": return "จำหน่ายแล้ว";
            default: return condition;
        }
    };

    const getConditionColor = (condition: string | null) => {
        if (!condition) return "bg-gray-100 text-gray-600";
        switch (condition) {
            case "NORMAL": return "bg-green-100 text-green-800";
            case "BROKEN": return "bg-red-100 text-red-800";
            case "LOST": return "bg-red-100 text-red-800";
            case "WAIT_DISPOSE": return "bg-yellow-100 text-yellow-800";
            case "DISPOSED": return "bg-purple-100 text-purple-800";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch("/api/borrow/history/me?exclude=pending", {
                    cache: "no-store",
                    credentials: "include"
                });
                const result = await response.json();
                const list = Array.isArray(result) ? result : (result?.data ?? []);
                setData(list);
            } catch (error) {
                console.error("Error fetching history:", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-gray-500">กำลังโหลดข้อมูล...</div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        ประวัติการยืมครุภัณฑ์
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-Pink text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">คำขอ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">สถานะ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">วันที่ยืม</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">วันที่คืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">สภาพหลังคืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">เหตุผลที่คืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">เหตุผล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Image src="/icons/data.png" alt="No data" width={48} height={48} className="opacity-50" />
                                            <span>ไม่พบข้อมูลประวัติการยืม</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                            #{item.id}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLOR[item.status]}`}>
                                                {STATUS_TEXT[item.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            {formatDate(item.borrowDate)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            <div>กำหนด: {formatDate(item.returnDue)}</div>
                                            {item.actualReturnDate && (
                                                <div className="text-green-600">คืนแล้ว: {formatDate(item.actualReturnDate)}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            <div className="font-medium">{item.equipmentCode || "-"}</div>
                                            <div className="text-gray-600">{item.equipmentName || "-"}</div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            {item.status === "RETURNED" ? (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(item.returnCondition)}`}>
                                                    {getConditionText(item.returnCondition)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            {item.status === "RETURNED" && item.returnNotes ? (
                                                <div title={item.returnNotes}>
                                                    {item.returnNotes}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                            {item.reason || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
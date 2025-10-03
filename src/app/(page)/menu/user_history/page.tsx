"use client";
import { useEffect, useState, useMemo } from "react";
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

type GroupedHistoryItem = {
    id: number;
    borrowDate: string | null;
    returnDue: string | null;
    actualReturnDate: string | null;
    status: Status;
    reason: string;
    returnNotes: string | null;
    equipments: {
        code: string;
        name: string;
        returnCondition: string | null;
    }[];
};

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

export default function UserHistory() {
    const [data, setData] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 5;

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

    // Group items by request ID
    const groupedData = useMemo((): GroupedHistoryItem[] => {
        const grouped = new Map<number, GroupedHistoryItem>();

        data.forEach(item => {
            if (!grouped.has(item.id)) {
                grouped.set(item.id, {
                    id: item.id,
                    borrowDate: item.borrowDate,
                    returnDue: item.returnDue,
                    actualReturnDate: item.actualReturnDate,
                    status: item.status,
                    reason: item.reason,
                    returnNotes: item.returnNotes,
                    equipments: []
                });
            }

            const group = grouped.get(item.id)!;
            group.equipments.push({
                code: item.equipmentCode,
                name: item.equipmentName,
                returnCondition: item.returnCondition
            });
        });

        return Array.from(grouped.values());
    }, [data]);

    // Filter and sort data
    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        return groupedData
            .filter((item) => {
                // Filter by status
                if (statusFilter !== "ALL" && item.status !== statusFilter) {
                    return false;
                }

                // Filter by search term
                return (
                    item.equipments.some(eq =>
                        eq.code.toLowerCase().includes(q) ||
                        eq.name.toLowerCase().includes(q)
                    ) ||
                    item.reason.toLowerCase().includes(q) ||
                    STATUS_TEXT[item.status].toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                const aDate = new Date(a.borrowDate || "").getTime();
                const bDate = new Date(b.borrowDate || "").getTime();
                return sortOrder === "newest" ? bDate - aDate : aDate - bDate;
            });
    }, [groupedData, searchTerm, statusFilter, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    // Reset to page 1 when changing filters or search
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm]);

    // Count by status (count from original data, not grouped)
    const statusCounts = useMemo(() => {
        const counts = { PENDING: 0, APPROVED: 0, RETURNED: 0, REJECTED: 0 };
        data.forEach(item => {
            counts[item.status]++;
        });
        return counts;
    }, [data]);

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

                {/* Status Summary */}
                <div className="px-4 py-3 bg-gray-50 border-b">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-sm font-medium text-gray-700">สรุปรายการ:</span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            อนุมัติแล้ว: {statusCounts.APPROVED}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            คืนแล้ว: {statusCounts.RETURNED}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            ไม่อนุมัติ: {statusCounts.REJECTED}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            รวม: {data.length}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">สถานะ:</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as "ALL" | Status)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="ALL">ทั้งหมด</option>
                                <option value="APPROVED">อนุมัติแล้ว/รอคืน</option>
                                <option value="RETURNED">คืนแล้ว</option>
                                <option value="REJECTED">ไม่อนุมัติ</option>
                            </select>
                        </div>

                        {/* Search and Sort */}
                        <div className="flex items-center gap-4">
                            {/* Search Bar */}
                            <div className="min-w-[200px]">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="ค้นหาเลข/ชื่อครุภัณฑ์"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Image
                                        src="/icons/search.png"
                                        alt="search"
                                        width={20}
                                        height={20}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Sort Button */}
                            <button
                                onClick={() => setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))}
                                className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition duration-150 flex items-center justify-center ${sortOrder === "newest" ? "bg-blue-50" : "bg-pink-50"
                                    }`}
                                title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                            >
                                <Image src="/icons/HamBmenu.png" alt="เรียงข้อมูล" width={20} height={20} />
                                <span className="sr-only">เรียงข้อมูล</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-Pink text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">คำขอ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">สถานะ</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">วันที่ยืม</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">วันที่คืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">รายการครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">สภาพหลังคืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">เหตุผลที่คืน</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">เหตุผล</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Image src="/icons/data.png" alt="No data" width={48} height={48} className="opacity-50" />
                                            <span>ไม่พบข้อมูลประวัติการยืม</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((item) => (
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
                                            <div className="space-y-2">
                                                {item.equipments.map((equipment, idx) => (
                                                    <div key={idx} className="border-l-2 border-gray-200 pl-3">
                                                        <div className="font-medium">{equipment.code || "-"}</div>
                                                        <div className="text-gray-600">{equipment.name || "-"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">
                                            {item.status === "RETURNED" ? (
                                                <div className="space-y-2">
                                                    {item.equipments.map((equipment, idx) => (
                                                        <div key={idx} className="border-l-2 border-gray-200 pl-3">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(equipment.returnCondition)}`}>
                                                                {getConditionText(equipment.returnCondition)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
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

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                            แสดง {filteredData.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            className={`px-3 py-1 text-sm ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 cursor-pointer'}`}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                            // Show only current page and 2 pages before/after
                            if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded text-sm ${currentPage === pageNum
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                            ) {
                                return <span key={pageNum} className="text-gray-400">...</span>;
                            }
                            return null;
                        })}

                        <button
                            className={`px-3 py-1 text-sm ${currentPage === totalPages || totalPages === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-gray-900 cursor-pointer'}`}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

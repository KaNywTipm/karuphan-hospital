"use client";

import Image from "next/image";
import { useState } from "react";
import { borrowReturnData, type BorrowReturn } from "@/lib/data";

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState("รออนุมัติ");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on active tab
    const filteredData = borrowReturnData.filter(item => {
        const matchesSearch = item.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.equipmentCode.includes(searchTerm) ||
            item.department.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesTab = (() => {
            switch (activeTab) {
                case "รออนุมัติ":
                    return item.status === "รออนุมัติ";
                case "อนุมัติแล้ว/ยืมแล้ว":
                    return item.status === "อนุมัติ";
                case "คืนแล้ว":
                    return item.status === "คืนแล้ว";
                case "ไม่อนุมัติ/ยกเลิก":
                    return item.status === "ไม่อนุมัติ";
                default:
                    return true;
            }
        })();

        return matchesSearch && matchesTab;
    });

    const tabs = [
        {
            name: "รออนุมัติ",
            color: "bg-blue-400 text-white",
            count: borrowReturnData.filter(item => item.status === "รออนุมัติ").length
        },
        {
            name: "อนุมัติแล้ว/รอคืน",
            color: "bg-yellow-400 text-white",
            count: borrowReturnData.filter(item => item.status === "อนุมัติ").length
        },
        {
            name: "คืนแล้ว",
            color: "bg-green-500 text-white",
            count: borrowReturnData.filter(item => item.status === "คืนแล้ว").length
        },
        {
            name: "ไม่อนุมัติ/ยกเลิก",
            color: "bg-red-500 text-white",
            count: borrowReturnData.filter(item => item.status === "ไม่อนุมัติ").length
        }
    ];

    const getActionButtonStyle = (status: string) => {
        switch (status) {
            case "อนุมัติ":
                return "bg-blue-500 text-white px-3 py-1 rounded text-sm";
            case "ไม่อนุมัติ":
                return "bg-red-500 text-white px-3 py-1 rounded text-sm";
            case "รออนุมัติ":
                return "bg-yellow-500 text-white px-3 py-1 rounded text-sm";
            case "คืนแล้ว":
                return "bg-green-500 text-white px-3 py-1 rounded text-sm";
            default:
                return "bg-gray-500 text-white px-3 py-1 rounded text-sm";
        }
    };

    const handleStatusChange = (id: number, newStatus: BorrowReturn['status']) => {
        // TODO: Implement API call to update status
        console.log(`Updating item ${id} to status: ${newStatus}`);
    };

    return (
        <div className="p-6 bg-white min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">รายการยืม-คืน</h1>

                {/* Status Tabs */}
                <div className="flex gap-4 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === tab.name
                                ? tab.color
                                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search and Table Section */}
            <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">รายการยืมมาใหม่</h2>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                <Image src="/HamBmenu.png" alt="menu" width={20} height={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-red-400 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium">ลำดับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ผู้ยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">บุคลากร</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">เลขครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">กำหนดคืน</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">เหตุผลที่ยืม</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">การอนุมัติ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredData.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.borrowerName}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.department}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.equipmentCode}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.category}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.returnDate}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.reason}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <button
                                            className={getActionButtonStyle(item.status)}
                                            onClick={() => handleStatusChange(item.id, item.status)}
                                        >
                                            {item.status}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                            แสดง {filteredData.length} รายการ จากทั้งหมด {borrowReturnData.length} รายการ
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                            disabled={currentPage === 1}
                        >
                            ← Previous
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                            {currentPage}
                        </button>
                        <button
                            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                            disabled={filteredData.length < 10}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
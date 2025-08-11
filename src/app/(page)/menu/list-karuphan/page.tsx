"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { inCPUData, outCPUData, updateEquipmentStatus } from "@/lib/data";
import Addkaruphan from "@/components/modal/Add-karuphan";
import Editkaruphan from "@/components/modal/Edit-karuphan";

const itemsPerPage = 5;

const ListKaruphan = () => {
    // อัปเดตสถานะครุภัณฑ์ก่อนโหลดข้อมูล
    useEffect(() => {
        updateEquipmentStatus();

        // รีเฟรชข้อมูลทุก 5 วินาที เพื่อให้ข้อมูลอัปเดตอยู่เสมอ
        const interval = setInterval(() => {
            updateEquipmentStatus();
            const updatedData = [...inCPUData, ...outCPUData];
            setItems(updatedData);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // รวมข้อมูลครุภัณฑ์ทั้งภายในและภายนอก
    const allEquipmentData = [...inCPUData, ...outCPUData];

    const [items, setItems] = useState(allEquipmentData);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const filteredData = items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDisplayStatus(item.status).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handleAddClick = () => {
        setShowAddModal(true);
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setShowEditModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedItem(null);
    };

    const handleAddItem = (newItemData: any) => {
        const newItem = {
            ...newItemData,
            id: Math.max(...items.map(item => item.id)) + 1,
        };
        setItems(prev => [...prev, newItem]);
        setShowAddModal(false);

        // อัปเดตสถานะครุภัณฑ์หลังเพิ่มข้อมูล
        updateEquipmentStatus();

        // รีเฟรชข้อมูล
        const updatedData = [...inCPUData, ...outCPUData];
        setItems(updatedData);
    };

    const handleUpdateItem = (updatedItemData: any) => {
        setItems(prev =>
            prev.map(item =>
                item.id === updatedItemData.id ? { ...item, ...updatedItemData } : item
            )
        );
        setShowEditModal(false);
        setSelectedItem(null);

        // อัปเดตสถานะครุภัณฑ์หลังแก้ไขข้อมูล
        updateEquipmentStatus();

        // รีเฟรชข้อมูล
        const updatedData = [...inCPUData, ...outCPUData];
        setItems(updatedData);
    };

    // ฟังก์ชันแปลงวันที่จาก yyyy-mm-dd เป็น dd/mm/yyyy
    const formatDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // ฟังก์ชันจัดรูปแบบราคา
    const formatPrice = (price: number) => {
        return price.toLocaleString();
    };

    // ฟังก์ชันกำหนดสีสถานะ
    const getStatusColor = (status: string) => {
        if (status === 'ปกติ') {
            return 'bg-green-100 text-green-800';
        } else if (status === 'ชำรุด') {
            return 'bg-red-100 text-red-800';
        } else if (status === 'สูญหาย') {
            return 'bg-gray-100 text-gray-800';
        } else if (status === 'รอจำหน่าย') {
            return 'bg-yellow-100 text-yellow-800';
        } else if (status === 'จำหน่ายแล้ว') {
            return 'bg-purple-100 text-purple-800';
        } else if (status.startsWith('ยืมโดย')) {
            return 'bg-orange-100 text-orange-800';  // เปลี่ยนเป็นสีส้มสำหรับ "กำลังใช้งาน"
        } else {
            return 'bg-gray-100 text-gray-800';
        }
    };

    // ฟังก์ชันจัดการการแสดงสถานะ
    const getDisplayStatus = (status: string) => {
        if (status.startsWith('ยืมโดย')) {
            return 'กำลังใช้งาน';
        }
        return status;
    };

    // ฟังก์ชันรีเฟรชข้อมูล
    const handleRefresh = () => {
        updateEquipmentStatus();
        const updatedData = [...inCPUData, ...outCPUData];
        setItems(updatedData);
        setCurrentPage(1);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            {/* Section: Table */}
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">จัดการครุภัณฑ์</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleAddClick}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Image src="/plus.png" alt="add" width={16} height={16} />
                            เพิ่มข้อมูลครุภัณฑ์
                        </button>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาครุภัณฑ์"
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
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[150px]">เลขครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium">ชื่อครุภัณฑ์</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">ราคาเมื่อได้รับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[100px]">วันที่ได้รับ</th>
                                <th className="px-4 py-3 text-left text-sm font-medium w-[120px]">สถานะ</th>
                                <th className="px-2 py-3 text-center text-sm font-medium w-[90px]">แก้ไข</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {currentItems.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.id}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.code}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{formatPrice(item.price)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.receivedDate)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(item.status)}`}>
                                            {getDisplayStatus(item.status)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-sm text-center">
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="bg-Yellow text-White px-3 py-1 rounded text-sm hover:bg-yellow-600"
                                        >
                                            <Image src="/edit.png" alt="edit" width={20} height={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                                        ไม่พบครุภัณฑ์ที่ค้นหา
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-gray-700">
                        แสดง {startIndex + 1} - {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={goToPreviousPage}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            disabled={currentPage === 1}
                        >
                            ← Previous
                        </button>
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                            {currentPage}
                        </span>
                        <button
                            onClick={goToNextPage}
                            className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </section>

            {/* Modals */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <Addkaruphan onClose={handleCloseModal} onAdd={handleAddItem} />
                </div>
            )}

            {showEditModal && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <Editkaruphan item={selectedItem} onClose={handleCloseModal} onUpdate={handleUpdateItem} />
                </div>
            )}
        </div>
    );
};

export default ListKaruphan;

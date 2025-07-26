"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { users as initialUsers } from "@/lib/data";
import Editpersonnel from "@/components/modal/Edit-personnel";
import Unit, { displayUnitLabel } from '@/components/dropdown/Unit';

const ITEMS_PER_PAGE = 10;

const Managepersonnel = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userList, setUserList] = useState(initialUsers);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleDeleteItem = (id: number) => {
    const updatedItems = userList.filter((item) => item.id !== id);
    setUserList(updatedItems);

    const newTotalPages = Math.ceil(updatedItems.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages) {
      setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
    }
  };

  const openEditModal = (id: number) => {
    setEditId(id);
    setShowModal(true);
  };

  const closeModal = () => {
    setEditId(null);
    setShowModal(false);
  };

  // ฟังก์ชันสำหรับบันทึกข้อมูลจาก modal
  const handleSave = (updatedUser: {
    id: number;
    fullName: string;
    role: string;
    phone: string;
  }) => {
    const updatedList = userList.map((user) =>
      user.id === updatedUser.id ? updatedUser : user
    );
    setUserList(updatedList);
    closeModal();
  };

  // กรอง admin ทิ้ง และกรองตาม search term
  const filteredData = userList.filter(
    (user) =>
      user.role !== "admin" &&
      (user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // คำนวณ index เริ่มต้นและสิ้นสุดของข้อมูลที่จะแสดงในหน้าปัจจุบัน
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  // ตัดข้อมูลแสดงเฉพาะหน้าปัจจุบัน
  const currentPageData = filteredData.slice(startIndex, endIndex);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">จัดการบุคลากร</h1>

        <section className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">ข้อมูลบุคลากร</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาบุคลากร"
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
                  <th className="px-4 py-3 text-left text-sm font-medium w-1/12">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ชื่อ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">บุคลากร</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">เบอร์โทร</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">แก้ไข</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {currentPageData.map((user, index) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{displayUnitLabel(user.role)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.phone}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <button
                        onClick={() => openEditModal(user.id)}
                        className="bg-yellow-400 text-white px-3 py-1 rounded text-sm"
                      >
                        <Image src="/edit.png" alt="edit" width={20} height={20} />
                      </button>
                    </td>
                    <td className="px-2 py-3 text-sm text-center">
                      <button
                        onClick={() => handleDeleteItem(user.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        <Image src="/delete.png" alt="delete" width={20} height={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-4">
                      ไม่พบข้อมูลบุคลากร
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
      </div>

      {showModal && (
        <Editpersonnel
          onClose={closeModal}
          user={userList.find((user) => user.id === editId)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Managepersonnel;

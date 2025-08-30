"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Editpersonnel from "@/components/modal/Edit-personnel";
import { displayUnitLabel } from "@/components/dropdown/Unit";

const ITEMS_PER_PAGE = 10;

type UserRow = {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  role: "ADMIN" | "INTERNAL" | "EXTERNAL";
  department?: { id: number; name: string } | null;
  changeNote?: string;
};

export default function Managepersonnel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // โหลดรายชื่อผู้ใช้ (exclude ADMIN เริ่มต้น)
  async function load(q = "") {
    setLoading(true);
    try {
      const r = await fetch(`/api/users?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      setUsers(Array.isArray(j?.data) ? j.data : []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ค้นหา + เรียง + ตัดหน้า
  const filteredData = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    const list = (users || [])
      .filter(u =>
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.department?.name || "").toLowerCase().includes(q)
      )
      .sort((a, b) => (sortOrder === "newest" ? b.id - a.id : a.id - b.id));
    return list;
  }, [users, searchTerm, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const openEditModal = (id: number) => { setEditId(id); setShowModal(true); };
  const closeModal = () => { setEditId(null); setShowModal(false); };

  // บันทึกจาก modal → PATCH /api/users/:id
  const handleSave = (payload: { id: number; fullName: string; role: "ADMIN" | "INTERNAL" | "EXTERNAL"; phone?: string | null; departmentId: number | null }) => {
    const role = payload.role;
    const body = {
      fullName: payload.fullName,
      phone: payload.phone ?? null,
      role,
      departmentId: payload.departmentId,
      changeNote: (payload as any).changeNote ?? undefined,
    };
    fetch(`/api/users/${payload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(r => r.json())
      .then(j => {
        if (!j.ok) return alert("บันทึกไม่สำเร็จ");
        // อัปเดตใน state ทันที
        setUsers(prev => prev.map(u => (u.id === payload.id ? j.data : u)));
        closeModal();
      });
  };

  // ลบผู้ใช้
  const handleDeleteItem = async (id: number) => {
    if (!confirm("ยืนยันการลบผู้ใช้นี้?")) return;
    const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!j?.ok) return alert("ลบไม่สำเร็จ");
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    const newTotalPages = Math.ceil(updated.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages) setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
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
                  placeholder="ค้นหาบุคลากร (ชื่อ/อีเมล/เบอร์/หน่วยงาน)"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); load(e.target.value); }}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Image src="/search.png" alt="search" width={20} height={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              </div>
              <button
                onClick={() => setSortOrder(p => (p === "newest" ? "oldest" : "newest"))}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
              >
                <Image src="/HamBmenu.png" alt="sort" width={20} height={20} />
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
                  <th className="px-4 py-3 text-left text-sm font-medium">กลุ่มงาน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">เบอร์โทร</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">แก้ไข</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="text-center py-6">กำลังโหลด...</td></tr>
                )}

                {!loading && currentPageData.map((user, index) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {displayUnitLabel(user.role.toLowerCase() as any)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <button onClick={() => openEditModal(user.id)} className="bg-yellow-400 text-white px-3 py-1 rounded text-sm">
                        <Image src="/edit.png" alt="edit" width={20} height={20} />
                      </button>
                    </td>
                    <td className="px-2 py-3 text-sm text-center">
                      <button onClick={() => handleDeleteItem(user.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                        <Image src="/delete.png" alt="delete" width={20} height={20} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-4">ไม่พบข้อมูลบุคลากร</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-700">
              แสดง {filteredData.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
            </span>
            <div className="flex items-center gap-1">
              <button onClick={goToPreviousPage} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50" disabled={currentPage === 1}>← Previous</button>
              <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">{currentPage}</span>
              <button onClick={goToNextPage} className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50" disabled={currentPage === totalPages || totalPages === 0}>Next →</button>
            </div>
          </div>
        </section>
      </div>

      {showModal && (
        <Editpersonnel
          onClose={closeModal}
          user={
            (() => {
              const u = users.find((u) => u.id === editId);
              if (!u) return undefined;
              return {
                ...u,
                phone: u.phone ?? "",
              };
            })()
          }
          onSave={handleSave}
        />
      )}
    </div>
  );
}

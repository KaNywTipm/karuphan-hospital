"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserModals } from "@/components/Modal-Notification/UserModalSystem";
import Editpersonnel from "@/components/modal/Edit-personnel";
import { displayUnitLabel, UnitFilterDropdown, useUnitFilter, allUnits } from "@/components/dropdown/Unit";

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
  const router = useRouter();
  const { alert, confirm, AlertModal, ConfirmModal } = useUserModals();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(""); // เพิ่ม state สำหรับกรองกลุ่มงาน
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  // เอาไว้ยกเลิก fetch เก่าเวลามีคำค้นใหม่
  const abortRef = useRef<AbortController | null>(null);

  async function safeJSON(res: Response) {
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return await res.json();
      return { ok: false, status: res.status, reason: "not-json" };
    } catch {
      return { ok: false, status: res.status, reason: "parse-error" };
    }
  }

  async function load(q = "") {
    // ยกเลิก request เดิมก่อน
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const r = await fetch(`/api/users?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (r.status === 401) {
        alert.warning("เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่");
        router.replace("/sign-in");
        return;
      }
      if (r.status === 403) {
        alert.warning("คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ (เฉพาะผู้ดูแลระบบเท่านั้น)");
        return;
      }

      const j = await safeJSON(r);
      if (r.ok && j?.ok) {
        const list: UserRow[] = Array.isArray(j.items)
          ? j.items
          : Array.isArray(j.data)
            ? j.data
            : [];
        setUsers(list);
      } else {
        console.warn("load users failed:", j);
        alert.error("ไม่สามารถโหลดรายชื่อผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      // ถ้าเป็นการ abort จะไม่ต้องเตือน
      if (err?.name !== "AbortError") {
        console.error(err);
        alert.error("เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      }
    } finally {
      setLoading(false);
    }
  }

  // โหลดรอบแรก
  useEffect(() => {
    load("");
    // cleanup: ยกเลิกถ้ายัง pending ตอน unmount
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce 300ms เวลาเปลี่ยนคำค้นหา
  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      load(searchTerm.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // รีเซ็ตหน้าเมื่อเปลี่ยนการกรอง
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnit]);

  const filteredData = useMemo(() => {
    // ฝั่ง server เราก็ค้นหาให้แล้ว อันนี้แค่เผื่อ refine อีกชั้น
    const q = (searchTerm || "").toLowerCase();
    let list = (users || [])
      .filter(
        (u) =>
          (u.fullName || "").toLowerCase().includes(q) ||
          (u.phone || "").includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.department?.name || "").toLowerCase().includes(q),
      );

    // กรองตามกลุ่มงานที่เลือก (ถ้ามี)
    if (selectedUnit) {
      const selectedUnitLabel = allUnits.find(u => u.id.toString() === selectedUnit)?.label;
      if (selectedUnitLabel) {
        list = list.filter(item => item.department?.name === selectedUnitLabel);
      }
    }

    // เรียงลำดับ
    list = list.sort((a, b) => (sortOrder === "newest" ? b.id - a.id : a.id - b.id));

    return list;
  }, [users, searchTerm, selectedUnit, sortOrder]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageData = filteredData.slice(startIndex, endIndex);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goToNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  const openEditModal = (id: number) => { setEditId(id); setShowModal(true); };
  const closeModal = () => { setEditId(null); setShowModal(false); };

  const handleSave = (payload: {
    id: number;
    fullName: string;
    role: "ADMIN" | "INTERNAL" | "EXTERNAL";
    phone?: string | null;
    departmentId: number | null;
  }) => {
    const body = {
      fullName: payload.fullName,
      phone: payload.phone ?? null,
      role: payload.role,
      departmentId: payload.departmentId,
      changeNote: (payload as any).changeNote ?? undefined,
    };

    fetch(`/api/users/${payload.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (r.status === 401) { alert.warning("เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่"); router.replace("/sign-in"); return null; }
        if (r.status === 403) { alert.warning("คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้"); return null; }
        return safeJSON(r);
      })
      .then((j: any) => {
        if (!j) return;
        const updated = j.item ?? j.data ?? j.user;
        if (!j.ok || !updated) return alert.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
        // ดึง users ใหม่จาก backend เพื่อให้ข้อมูลล่าสุดเสมอ (เช่น กลุ่มงานที่ disconnect แล้ว)
        load("");
        closeModal();
        alert.success("บันทึกข้อมูลบุคลากรเรียบร้อยแล้ว");
      })
      .catch(() => alert.error("ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ"));
  };

  const handleDeleteItem = async (id: number) => {
    confirm.show("ยืนยันการลบผู้ใช้นี้?", async () => {
      const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const j = await safeJSON(r);
      if (r.status === 401) { alert.warning("เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่"); router.replace("/sign-in"); return; }
      if (r.status === 403) { alert.warning("คุณไม่มีสิทธิ์ลบผู้ใช้"); return; }
      if (!j?.ok) return alert.error("ไม่สามารถลบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง");

      const updated = users.filter((u) => u.id !== id);
      setUsers(updated);
      const newTotalPages = Math.ceil(updated.length / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages) setCurrentPage(newTotalPages > 0 ? newTotalPages : 1);
      alert.success("ลบบุคลากรเรียบร้อยแล้ว");
    }, { type: "danger", confirmText: "ลบ", cancelText: "ยกเลิก" });
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">จัดการบุคลากร</h1>

        <section className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">ข้อมูลบุคลากร</h2>

            {/* ส่วนค้นหาและกรอง */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Dropdown กรองกลุ่มงาน */}
              <div className="w-full lg:w-80">
                <UnitFilterDropdown
                  selectedUnit={selectedUnit}
                  onUnitChange={setSelectedUnit}
                  placeholder="กรองตามกลุ่มงาน"
                  showAllOption={true}
                  className="w-full"
                />
              </div>

              {/* ช่องค้นหาและปุ่มเมนู */}
              <div className="flex items-center gap-2 flex-1 lg:flex-none lg:w-auto">
                {/* ช่องค้นหา */}
                <div className="relative flex-1 lg:w-96">
                  <input
                    type="text"
                    placeholder="ค้นหาบุคลากร"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                    <Image
                      src="/search.png"
                      alt="search"
                      width={20}
                      height={20}
                      className="opacity-60"
                    />
                  </button>
                </div>

                {/* ปุ่มเมนู (แฮมเบอร์เกอร์) */}
                <button
                  onClick={() => setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))}
                  className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center ${sortOrder === "newest" ? "bg-blue-50" : "bg-pink-50"
                    }`}
                  title={sortOrder === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                >
                  <Image src="/HamBmenu.png" alt="เรียงข้อมูล" width={20} height={20} />
                  <span className="sr-only">เรียงข้อมูล</span>
                </button>
              </div>
            </div>

            {/* ปุ่มล้างตัวกรอง */}
            {(searchTerm || selectedUnit) && (
              <div className="flex justify-start mt-3">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedUnit("");
                  }}
                  className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                  title="ล้างตัวกรอง"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            )}

            {/* แสดงสถานะการกรอง */}
            {(searchTerm || selectedUnit) && (
              <div className="mt-3 p-2 bg-blue-50 rounded-md text-sm text-blue-700">
                <strong>กำลังกรอง:</strong>
                {searchTerm && <span> ค้นหา: &quot;{searchTerm}&quot;</span>}
                {selectedUnit && (
                  <span>
                    {searchTerm ? " | " : " "}
                    กลุ่มงาน: {allUnits.find(u => u.id.toString() === selectedUnit)?.label || "ไม่ระบุ"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-Pink text-White">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium w-1/12">ลำดับ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ชื่อ</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">สิทธิ์ในการเข้าถึง</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">บุคลากรกลุ่มงาน</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">เบอร์โทร</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">แก้ไข</th>
                  <th className="px-2 py-3 text-center text-sm font-medium w-[80px]">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-6">
                      กำลังโหลด...
                    </td>
                  </tr>
                )}
                {!loading &&
                  currentPageData.map((user, index) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {user.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {displayUnitLabel(user.role.toLowerCase() as any)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.department?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.phone ?? "-"}</td>
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
                {!loading && filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-4">
                      ไม่พบข้อมูลบุคลากร
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-700">
              แสดง {filteredData.length === 0 ? 0 : startIndex + 1} -{" "}
              {Math.min(endIndex, filteredData.length)} จาก {filteredData.length} รายการ
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
          user={(() => {
            const u = users.find((u) => u.id === editId);
            if (!u) return undefined;
            return { ...u, phone: u.phone ?? "" };
          })()}
          onSave={handleSave}
        />
      )}

      {/* Render the user-specific modals */}
      <AlertModal />
      <ConfirmModal />
    </div>
  );
} 

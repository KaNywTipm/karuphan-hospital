"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserModals } from "@/components/Modal-Notification/UserModalSystem";

// Types
type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

type UserRow = {
    id: number;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    role: Role;
    isActive: boolean;
    department?: { id: number; name: string } | null;
};

type Department = { id: number; name: string };

export default function VerifyHospitalUsersPage() {
    const router = useRouter();
    const { alert, AlertModal } = useUserModals();

    const [users, setUsers] = useState<UserRow[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assigning, setAssigning] = useState<number | null>(null); // userId while saving

    // Load departments once
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch("/api/departments", { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                const items: Department[] = Array.isArray(j?.items) ? j.items : [];
                setDepartments(items.sort((a, b) => a.name.localeCompare(b.name, "th")));
            } catch {
                // ignore
            }
        })();
    }, []);

    // Load users (EXTERNAL by default)
    const loadUsers = useCallback(async (q = "") => {
        setLoading(true);
        try {
            const r = await fetch(`/api/users?role=EXTERNAL&q=${encodeURIComponent(q)}`, { cache: "no-store" });
            if (r.status === 401) {
                alert.warning("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่");
                router.replace("/sign-in");
                return;
            }
            const j = await r.json().catch(() => ({}));
            const items: UserRow[] = Array.isArray(j?.items) ? j.items : [];
            setUsers(items);
        } catch {
            alert.error("โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [alert, router]);

    useEffect(() => { loadUsers(""); }, [loadUsers]);

    // Controlled department selection per user
    const [selectedDept, setSelectedDept] = useState<Record<number, string>>({});

    // Verify action: set role to INTERNAL and assign department
    async function verifyUser(u: UserRow) {
        const deptIdStr = selectedDept[u.id] ?? (u.department?.id ? String(u.department.id) : "");
        const deptId = deptIdStr ? Number(deptIdStr) : null;

        if (!deptId) {
            alert.warning("กรุณาเลือกกลุ่มงานที่จะผูกกับผู้ใช้ภายในองค์กร");
            return;
        }

        setAssigning(u.id);
        try {
            const r = await fetch(`/api/users/${u.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "INTERNAL", departmentId: deptId }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) throw new Error("save-failed");
            alert.success(`ยืนยันบัญชี ${u.fullName} เป็นบุคลากรภายในเรียบร้อยแล้ว`);
            // Reload list (user should disappear from EXTERNAL list)
            loadUsers(search);
        } catch (e) {
            alert.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setAssigning(null);
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) =>
            (u.fullName || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.phone || "").includes(q) ||
            (u.department?.name || "").toLowerCase().includes(q)
        );
    }, [users, search]);

    return (
        <div className="p-6 bg-white min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">ยืนยันบัญชีบุคลากรภายในโรงพยาบาล</h1>

            <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 w-full md:w-auto">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาชื่อ อีเมล เบอร์โทร หรือกลุ่มงาน"
                        className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={() => loadUsers(search)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >ค้นหา</button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full table-fixed">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left w-14">#</th>
                            <th className="px-4 py-2 text-left">ชื่อ</th>
                            <th className="px-4 py-2 text-left">อีเมล</th>
                            <th className="px-4 py-2 text-left">เบอร์โทร</th>
                            <th className="px-4 py-2 text-left">กลุ่มงาน</th>
                            <th className="px-4 py-2 text-center w-48">ยืนยันเป็นภายใน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={6} className="text-center py-6">กำลังโหลด...</td></tr>
                        )}
                        {!loading && filtered.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-gray-500 py-6">ไม่พบบัญชีที่รอยืนยัน</td></tr>
                        )}
                        {!loading && filtered.map((u, idx) => (
                            <tr key={u.id} className="border-t">
                                <td className="px-4 py-2">{idx + 1}</td>
                                <td className="px-4 py-2">{u.fullName}</td>
                                <td className="px-4 py-2">{u.email ?? '-'}</td>
                                <td className="px-4 py-2">{u.phone ?? '-'}</td>
                                <td className="px-4 py-2">
                                    <select
                                        className="w-full border border-gray-300 rounded px-2 py-1 bg-white"
                                        value={selectedDept[u.id] ?? (u.department?.id ? String(u.department.id) : "")}
                                        onChange={(e) => setSelectedDept((s) => ({ ...s, [u.id]: e.target.value }))}
                                    >
                                        <option value="">เลือกกลุ่มงาน</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        disabled={assigning === u.id}
                                        onClick={() => verifyUser(u)}
                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                                    >{assigning === u.id ? "กำลังบันทึก..." : "ยืนยัน"}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AlertModal />
        </div>
    );
}

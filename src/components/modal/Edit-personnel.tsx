"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

type Department = {
    id: number;
    name: string;
};

type UserForEdit = {
    id: number;
    fullName: string;
    phone?: string | null;
    email?: string | null;
    role: Role;
    department?: { id: number; name: string } | null;
};

type Props = {
    user?: UserForEdit;
    onClose: () => void;
    onSave: (payload: {
        id: number;
        fullName: string;
        role: Role;
        phone?: string | null;
        departmentId: number | null;
        changeNote?: string;
    }) => void;
};

type FormState = {
    fullName: string;
    role: Role;
    phone: string;
    departmentId: string; // เก็บเป็น string ใน select -> ค่อยแปลงเป็น number|null ตอนเซฟ
    changeNote: string;
};

export default function EditPersonnel({ user, onClose, onSave }: Props) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingDept, setLoadingDept] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const deptOptions = useMemo(
        () => departments.slice().sort((a, b) => a.name.localeCompare(b.name, "th")),
        [departments]
    );

    const [form, setForm] = useState<FormState>(() => ({
        fullName: user?.fullName ?? "",
        role: user?.role ?? "INTERNAL",
        phone: user?.phone ?? "",
        departmentId:
            user?.department?.id != null ? String(user.department.id) : "",
        changeNote: "",
    }));

    // โหลดรายการกลุ่มงาน (ขึ้นให้ครบ) — รองรับทั้ง {items} และ {data}
    useEffect(() => {
        let alive = true;

        async function safeJSON(res: Response) {
            try {
                const ct = res.headers.get("content-type") || "";
                if (ct.includes("application/json")) return await res.json();
                return {};
            } catch {
                return {};
            }
        }

        (async () => {
            setLoadingDept(true);
            try {
                const res = await fetch("/api/departments", { cache: "no-store" });
                const json = await safeJSON(res) as any;

                if (!alive) return;

                const list: Department[] = Array.isArray(json?.items)
                    ? json.items
                    : Array.isArray(json?.data)
                        ? json.data
                        : [];

                // เรียงชื่อแบบภาษาไทย
                list.sort((a, b) => a.name.localeCompare(b.name, "th"));

                setDepartments(list);
            } finally {
                if (alive) setLoadingDept(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    // ถ้าไม่มี user ให้ไม่แสดง (กัน crash)
    if (!user) return null;

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.fullName.trim()) e.fullName = "กรุณากรอกชื่อ-สกุล";
        if (!form.role) e.role = "กรุณาเลือกประเภทบุคลากร";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            if (!user) return;
            onSave({
                id: user.id,
                fullName: form.fullName.trim(),
                role: form.role,
                phone: form.phone.trim() ? form.phone.trim() : null,
                departmentId:
                    form.departmentId === "" ? null : Number(form.departmentId),
                changeNote: form.changeNote.trim() || undefined,
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        แก้ไขข้อมูลบุคลากร
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-gray-100"
                        aria-label="ปิด"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24">
                            <path
                                d="M6 6l12 12M18 6L6 18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-5 grid grid-cols-1 gap-4">
                        {/* ชื่อ-สกุล */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ชื่อ-สกุล
                            </label>
                            <input
                                type="text"
                                value={form.fullName}
                                onChange={(e) =>
                                    setForm((s) => ({ ...s, fullName: e.target.value }))
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="เช่น สมชาย ใจดี"
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
                            )}
                        </div>

                        {/* ประเภทบุคลากร */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ประเภทบุคลากร
                                </label>
                                <select
                                    value={form.role}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, role: e.target.value as Role }))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="INTERNAL">INTERNAL</option>
                                    <option value="EXTERNAL">EXTERNAL</option>
                                </select>
                                {errors.role && (
                                    <p className="mt-1 text-xs text-red-600">{errors.role}</p>
                                )}
                            </div>

                            {/* กลุ่มงาน */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    กลุ่มงาน (เลือกได้ถ้ามี)
                                </label>
                                <select
                                    value={form.departmentId}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, departmentId: e.target.value }))
                                    }
                                    disabled={loadingDept}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">— ไม่สังกัด —</option>
                                    {deptOptions.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                                {loadingDept && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        กำลังโหลดรายการกลุ่มงาน...
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* เบอร์โทร */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                เบอร์โทร
                            </label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) =>
                                    setForm((s) => ({ ...s, phone: e.target.value }))
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="เช่น 0812345678"
                            />
                        </div>

                        {/* เหตุผล/บันทึกการเปลี่ยนแปลง */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                บันทึกการเปลี่ยนแปลง (ถ้ามี)
                            </label>
                            <textarea
                                value={form.changeNote}
                                onChange={(e) =>
                                    setForm((s) => ({ ...s, changeNote: e.target.value }))
                                }
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="เช่น ปรับให้เป็น INTERNAL และกำหนดกลุ่มงาน …"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

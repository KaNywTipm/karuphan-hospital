"use client";

import { useEffect, useMemo, useState } from "react";

type Dept = { id: number; name: string };
type Me = {
    id: number; email: string; fullName: string; phone: string | null;
    role: "ADMIN" | "INTERNAL" | "EXTERNAL"; departmentId: number | null;
    department?: { id: number; name: string } | null;
};

export default function UserEditProfile() {
    const [me, setMe] = useState<Me | null>(null);
    const [depts, setDepts] = useState<Dept[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ fullName: "", phone: "", departmentId: "" });
    const loading = useMemo(() => !me || depts.length === 0, [me, depts]);

    useEffect(() => {
        (async () => {
            const [resMe, resDept] = await Promise.all([
                fetch("/api/users/me", { cache: "no-store" }),
                fetch("/api/departments", { cache: "no-store" }),
            ]);

            const a = await safeJSON(resMe);
            const b = await safeJSON(resDept);

            if (a.ok) {
                setMe(a.user);
                setForm({
                    fullName: a.user.fullName ?? "",
                    phone: a.user.phone ?? "",
                    departmentId: a.user.departmentId ? String(a.user.departmentId) : "",
                });
            } else {
                console.error("users/me failed", a);
                alert("โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
            }

            if (b.ok) setDepts(b.items);
            else {
                console.error("departments failed", b);
                alert("โหลดรายการหน่วยงานไม่สำเร็จ");
            }
        })();
    }, []);

    async function safeJSON(res: Response) {
        try {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) return await res.json();
            // ไม่ใช่ JSON → ส่งสถานะกลับไปดีบัก
            return { ok: false, status: res.status, reason: "not-json" };
        } catch (e) {
            return { ok: false, status: res.status, reason: "parse-error" };
        }
    }

    if (loading) return <div className="p-6">กำลังโหลด…</div>;

    async function save(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // Example: send updated profile to API
        const res = await fetch("/api/users/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: form.fullName,
                phone: form.phone,
                departmentId: form.departmentId ? Number(form.departmentId) : null,
            }),
        });
        const result = await safeJSON(res);
        if (result.ok) {
            setMe(result.user);
            setIsEditing(false);
            await fetch("/api/auth/session?update", { method: "POST" }).catch(() => { });
            window.dispatchEvent(new Event("me:updated"));
        } else {
            alert("บันทึกข้อมูลไม่สำเร็จ");
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">ข้อมูลบุคลากร</h1>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="bg-BlueLight hover:bg-[#70a8b6] text-white px-6 py-2 rounded-md">
                            แก้ไขข้อมูล
                        </button>
                    )}
                </div>

                <form onSubmit={save} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* อีเมล (ล็อก) */}
                        <Field label="อีเมล" isEditing={false} value={me!.email} />

                        {/* หน่วยงาน (เลือกได้) */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">หน่วยงาน</label>
                            {isEditing ? (
                                <select
                                    value={form.departmentId}
                                    onChange={(e) => setForm(s => ({ ...s, departmentId: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-BlueLight"
                                >
                                    <option value="">— ไม่สังกัด —</option>
                                    {depts.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                                    {me?.department?.name ?? "ไม่สังกัด"}
                                </div>
                            )}
                        </div>

                        {/* ชื่อ-สกุล */}
                        <Field
                            label="ชื่อ-สกุล"
                            isEditing={isEditing}
                            value={form.fullName}
                            onChange={(v) => setForm(s => ({ ...s, fullName: v }))}
                            required
                        />

                        {/* เบอร์โทร */}
                        <Field
                            label="เบอร์โทร"
                            isEditing={isEditing}
                            value={form.phone}
                            onChange={(v) => setForm(s => ({ ...s, phone: v }))}
                            required
                        />
                    </div>

                    {isEditing && (
                        <div className="flex justify-center gap-4 pt-6 border-t border-gray-200">
                            <button type="submit" className="bg-BlueLight hover:bg-[#70a8b6] text-white px-8 py-2 rounded-md">
                                บันทึก
                            </button>
                            <button type="button" onClick={() => {
                                setIsEditing(false); setForm({
                                    fullName: me!.fullName ?? "", phone: me!.phone ?? "", departmentId: me!.departmentId ? String(me!.departmentId) : ""
                                });
                            }} className="bg-RedLight hover:bg-red-600 text-white px-8 py-2 rounded-md">
                                ยกเลิก
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

function Field({
    label, isEditing, value, onChange, required,
}: {
    label: string; isEditing: boolean; value: string;
    onChange?: (v: string) => void; required?: boolean;
}) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {isEditing && onChange ? (
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-BlueLight"
                    required={required}
                />
            ) : (
                <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700">{value || "ไม่ระบุ"}</div>
            )}
        </div>
    );
}

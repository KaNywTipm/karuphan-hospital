"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

type Department = {
    id: number;
    name: string;
};

type User = {
    id: number;
    fullName: string;
    role: Role;
    phone?: string | null;
    department?: { id: number; name: string } | null;
};

type EditpersonnelProps = {
    onClose: () => void;
    onSave: (payload: {
        id: number;
        fullName: string;
        role: Role;
        phone?: string | null;
        departmentId: number | null;
        changeNote?: string; // คงไว้แบบ optional เผื่อหน้า parent รับไว้ แต่จะไม่ส่งค่าใดๆ
    }) => void;
    user: User | undefined;
};

// หน่วยงานที่ถือเป็น INTERNAL
const INTERNAL_DEPT_NAME = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";

export default function Editpersonnel({ onClose, onSave, user }: EditpersonnelProps) {
    // ฟอร์ม
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<Role>("EXTERNAL");
    const [phone, setPhone] = useState<string>("");
    const [departmentId, setDepartmentId] = useState<number | null>(null);

    // ข้อมูลกลุ่มงาน
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingDept, setLoadingDept] = useState(true);

    // โหลดค่าเริ่มต้นจาก user
    useEffect(() => {
        if (!user) return;
        setFullName(user.fullName || "");
        setRole((user.role as Role) || "EXTERNAL");
        setPhone(user.phone || "");
        setDepartmentId(user.department?.id ?? null);
    }, [user]);

    // โหลดรายการกลุ่มงานจาก DB
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoadingDept(true);
                const res = await fetch("/api/departments", { cache: "no-store" });
                const json = await res.json().catch(() => ({ data: [] }));
                if (!alive) return;
                setDepartments(Array.isArray(json?.data) ? json.data : []);
            } finally {
                if (alive) setLoadingDept(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // เมื่อเปลี่ยนกลุ่มงาน → กำหนด role ตามกติกา (เว้นกรณีตั้งเป็น ADMIN เอง)
    useEffect(() => {
        if (role === "ADMIN") return; // ไม่ override ถ้าเลือกเป็น ADMIN เอง
        const deptName = departments.find((d) => d.id === departmentId)?.name;
        if (!deptName) {
            setRole("EXTERNAL");
        } else {
            setRole(deptName === INTERNAL_DEPT_NAME ? "INTERNAL" : "EXTERNAL");
        }
    }, [departmentId, departments]); // eslint-disable-line react-hooks/exhaustive-deps

    const deptOptions = useMemo(
        () => departments.slice().sort((a, b) => a.name.localeCompare(b.name, "th")),
        [departments]
    );

    if (!user) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // บันทึกตรงๆ ไม่ถาม/ไม่โน้ต
        onSave({
            id: user.id,
            fullName: fullName.trim(),
            role,
            phone: phone?.trim() || null,
            departmentId,
            // ไม่ส่ง changeNote
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black/30 fixed inset-0 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-[90%] md:w-[540px]">
                <div className="w-full flex justify-end">
                    <button onClick={onClose} aria-label="Close form" className="hover:opacity-80">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">ฟอร์มแก้ไขข้อมูล</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    {/* ชื่อบุคลากร */}
                    <FormRow label="ชื่อบุคลากร">
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="ชื่อ-สกุล"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    {/* กลุ่มงาน */}
                    <FormRow label="กลุ่มงาน">
                        <select
                            value={departmentId ?? ""}
                            onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            disabled={loadingDept}
                        >
                            <option value="">— ไม่ระบุ —</option>
                            {deptOptions.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </FormRow>

                    {/* สิทธิ์การใช้งาน */}
                    <FormRow label="สิทธิ์การใช้งาน">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        >
                            <option value="INTERNAL">INTERNAL (ภายใน)</option>
                            <option value="EXTERNAL">EXTERNAL (ภายนอก)</option>
                            <option value="ADMIN">ADMIN (ผู้ดูแล)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            * เลือกกลุ่มงาน “{INTERNAL_DEPT_NAME}” ระบบจะตั้งเป็น INTERNAL ให้อัตโนมัติ
                            (เว้นแต่คุณเปลี่ยนเป็น ADMIN เอง)
                        </p>
                    </FormRow>

                    {/* เบอร์โทร */}
                    <FormRow label="เบอร์โทร">
                        <input
                            value={phone ?? ""}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="เช่น 0812345678"
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    {/* ปุ่ม */}
                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="submit"
                            className="bg-BlueLight hover:bg-[#70a8b6] text-White px-4 py-2 rounded-md"
                        >
                            บันทึก
                        </button>
                        <button
                            type="button"
                            className="bg-RedLight hover:bg-red-600 text-White px-4 py-2 rounded-md"
                            onClick={onClose}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FormRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-4">
            <label className="w-32 font-medium text-gray-700 pt-2">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

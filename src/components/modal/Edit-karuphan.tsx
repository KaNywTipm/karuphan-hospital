"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useUserModals } from "@/components/Modal-Notification/UserModalSystem";


// ค.ศ. → พ.ศ. (YYYY-MM-DD)
const ceToThai = (ymdCE: string) => {
    if (!ymdCE) return ymdCE;
    const [y, m, d] = ymdCE.split("-");
    // handle invalid
    if (!y || !m || !d) return ymdCE;
    return `${String(Number(y) + 543).padStart(4, "0")}-${m}-${d}`;
};
// พ.ศ. → ค.ศ. (YYYY-MM-DD)
const thaiToCE = (ymdBE: string) => {
    if (!ymdBE) return ymdBE;
    const [y, m, d] = ymdBE.split("-");
    if (!y || !m || !d) return ymdBE;
    return `${String(Number(y) - 543).padStart(4, "0")}-${m}-${d}`;
};

type Category = { id: number; name: string };
type Item = {
    number: number;
    code: string;
    idnum?: string | null;
    name: string;
    price?: number | null;
    description?: string | null;
    receivedDate: string; // ค.ศ.
    status: "NORMAL" | "RESERVED" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    category?: { id: number; name: string } | null;
};

const statusOptions: { value: Item["status"]; label: string }[] = [
    { value: "NORMAL", label: "ปกติ" },
    { value: "RESERVED", label: "รออนุมัติ" },
    { value: "IN_USE", label: "กำลังใช้งาน" },
    { value: "BROKEN", label: "ชำรุด" },
    { value: "LOST", label: "สูญหาย" },
    { value: "WAIT_DISPOSE", label: "รอจำหน่าย" },
    { value: "DISPOSED", label: "จำหน่ายแล้ว" },
];

export default function Editkaruphan({
    item,
    onClose,
    onUpdate,
    modals,
}: {
    item: Item;
    onClose?: () => void;
    onUpdate?: () => void; // reload จากหน้า list
    modals?: ReturnType<typeof useUserModals>;  // Optional เพื่อรองรับเก่า
}) {
    const [categories, setCategories] = useState<Category[]>([]);

    // สร้าง modal system ไว้ใช้เผื่อไม่ได้ส่งมา
    const defaultModals = useUserModals();
    const modalSystem = modals || defaultModals;

    const [form, setForm] = useState({
        number: item.number,
        categoryId: item.category?.id || 0,
        code: item.code || "",
        idnum: item.idnum || "",
        name: item.name || "",
        description: item.description || "",
        price: item.price ?? "",
        receivedDateBE: ceToThai(item.receivedDate), // แสดง/กรอกเป็น พ.ศ.
        status: item.status,
    });

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/categories", { cache: "no-store" });
                const j = await res.json().catch(() => ({}));
                // Support both { data: [...] } and { categories: [...] } and fallback to []
                const list = Array.isArray(j?.data) ? j.data : (Array.isArray(j?.categories) ? j.categories : []);
                setCategories(list);
            } catch (e) {
                console.error("load categories failed", e);
                modalSystem.alert.error("ไม่สามารถโหลดหมวดหมู่ได้ กรุณาลองใหม่อีกครั้ง", "เกิดข้อผิดพลาด");
                setCategories([]);
            }
        })();
    }, [modalSystem.alert]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            code: form.code.trim(),
            idnum: form.idnum?.trim() || null,
            name: form.name.trim(),
            description: form.description || null,
            price: form.price ? Number(String(form.price).replace(/,/g, "")) : null,
            receivedDate: thaiToCE(form.receivedDateBE), // ส่งเป็น ค.ศ.
            categoryId: Number(form.categoryId),
            status: form.status,
        };
        const res = await fetch(`/api/equipment/${form.number}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
            modalSystem.alert.error(json?.error || "ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "เกิดข้อผิดพลาด");
            return;
        }
        // ถ้า response ส่ง receivedDate เป็นวันเดือนปีไทย (string) ให้ setForm ใหม่ด้วย
        if (json?.data?.receivedDate) {
            // รองรับทั้งกรณี API ส่งกลับเป็น พ.ศ. หรือ ค.ศ.
            let be = json.data.receivedDate;
            // ถ้าเป็นปี < 2500 ให้แปลงเป็น พ.ศ.
            if (/^\d{4}-\d{2}-\d{2}$/.test(be)) {
                const [y] = be.split("-");
                if (Number(y) < 2500) be = ceToThai(be);
            }
            setForm(s => ({ ...s, receivedDateBE: be }));
        }
        modalSystem.alert.success("แก้ไขข้อมูลครุภัณฑ์เรียบร้อยแล้ว", "สำเร็จ");
        onClose?.();
        onUpdate?.();
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-White p-8 rounded-2xl shadow-md w-[90%] md:w-[520px]">
                <div className="w-full flex justify-end">
                    <button onClick={onClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">ฟอร์มแก้ไขข้อมูลครุภัณฑ์</h2>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="ลำดับ (ID)">
                        <input readOnly value={form.number} className="form-input bg-gray-100 border rounded px-2 py-1 w-full" />
                    </FormRow>

                    <FormRow label="หมวดหมู่">
                        <select
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            value={form.categoryId}
                            onChange={(e) => setForm(s => ({ ...s, categoryId: Number(e.target.value) }))}
                            required
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </FormRow>

                    <FormRow label="เลขครุภัณฑ์">
                        <input
                            placeholder="0000-000-0000/0"
                            value={form.code}
                            onChange={(e) => setForm(s => ({ ...s, code: e.target.value }))}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="เลขที่ ID">
                        <input
                            value={form.idnum}
                            onChange={(e) => setForm(s => ({ ...s, idnum: e.target.value }))}
                            className="form-input border rounded px-2 py-1 w-full"
                            placeholder="กรอกเลข ID"
                        />
                    </FormRow>


                    <FormRow label="ชื่อครุภัณฑ์">
                        <input
                            value={form.name}
                            onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            required
                        />
                    </FormRow>

                    <FormRow label="รายละเอียด">
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full h-20 resize-none"
                        />
                    </FormRow>

                    <FormRow label="ราคาเมื่อได้รับ">
                        <input
                            value={String(form.price)}
                            onChange={(e) => setForm(s => ({ ...s, price: e.target.value }))}
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                        />
                    </FormRow>

                    <FormRow label="วันที่ได้รับ">
                        <div className="relative w-full flex items-center">
                            <input
                                type="date"
                                value={form.receivedDateBE}
                                onChange={e => {
                                    // ป้องกันการกรอกปี ค.ศ. (เช่น 2025) ให้แปลงเป็น พ.ศ. อัตโนมัติ
                                    let v = e.target.value;
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                                        const [y, m, d] = v.split("-");
                                        if (Number(y) < 2500) v = ceToThai(v);
                                    }
                                    setForm(s => ({ ...s, receivedDateBE: v }));
                                }}
                                placeholder="2568-01-01"
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full "
                                required
                            />
                        </div>
                    </FormRow>

                    <FormRow label="สถานะ">
                        <select
                            className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            value={form.status}
                            onChange={(e) => setForm(s => ({ ...s, status: e.target.value as Item["status"] }))}
                            required
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-6">
                        <button type="submit" className="bg-BlueLight hover:bg-[#70a8b6] text-White px-4 py-2 rounded-md">
                            บันทึกการแก้ไข
                        </button>
                        <button type="button" className="bg-RedLight hover:bg-red-600 text-White px-4 py-2 rounded-md" onClick={onClose}>
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>

            {/* แสดง Modal แจ้งเตือนถ้าไม่ได้ส่งมาจากภายนอก */}
            {!modals && (
                <>
                    <defaultModals.AlertModal />
                    <defaultModals.ConfirmModal />
                </>
            )}
        </div>
    );
}

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-4">
        <label className="w-32 font-medium text-gray-700">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

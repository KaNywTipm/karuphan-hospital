"use client";

import { useEffect, useState } from "react";
import Image from "next/image";


// พ.ศ. → ค.ศ.
const thaiToCE = (ymdBE: string) => {
    if (!ymdBE) return ymdBE;
    const [y, m, d] = ymdBE.split("-");
    return `${String(Number(y) - 543)}-${m}-${d}`;
};
// ค่าดีฟอลต์วันนี้ (พ.ศ.)
const todayBE = () => {
    const d = new Date();
    const y = d.getFullYear() + 543;
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
};

type Category = { id: number; name: string };

interface Props {
    onClose?: () => void;
    onAdd?: () => void;   // จะเรียกหลังบันทึกสำเร็จ เพื่อให้หน้า list reload
}

export default function Addkaruphan({ onClose, onAdd }: Props) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        categoryId: 0,
        code: "",
        idnum: "",
        name: "",
        description: "",
        price: "",
        receivedDateBE: todayBE(), // แสดง/กรอกเป็น พ.ศ.
    });

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/categories", { cache: "no-store" });
            const list = await res.json();
            setCategories(list || []);
            setLoading(false);
        })();
    }, []);

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
            status: "NORMAL" as const,
        };
        const res = await fetch("/api/equipment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) return alert(json?.error || "บันทึกไม่สำเร็จ");
        onClose?.();
        onAdd?.();
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
                    <h2 className="text-lg font-semibold">ฟอร์มเพิ่มข้อมูลครุภัณฑ์</h2>
                </div>

                {loading ? <div>กำลังโหลดหมวดหมู่...</div> : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                        <FormRow label="ลำดับ">
                            <input readOnly value="(อัตโนมัติ)" className="form-input bg-gray-100 border rounded px-2 py-1 w-full" />
                        </FormRow>

                        <FormRow label="หมวดหมู่">
                            <select
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                                value={form.categoryId}
                                onChange={(e) => setForm(s => ({ ...s, categoryId: Number(e.target.value) }))}
                                required
                            >
                                <option value={0} disabled>เลือกหมวดหมู่</option>
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
                                placeholder="ชุดแอลกอฮอลเท้าเหยียบ"
                                value={form.name}
                                onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))}
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                                required
                            />
                        </FormRow>

                        <FormRow label="รายละเอียดครุภัณฑ์">
                            <textarea
                                placeholder="เป็นสแตนเลส แบบเท้าเหยียบ"
                                value={form.description}
                                onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))}
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full h-20 resize-none"
                            />
                        </FormRow>

                        <FormRow label="ราคาเมื่อได้รับ">
                            <input
                                placeholder="60,000"
                                value={form.price}
                                onChange={(e) => setForm(s => ({ ...s, price: e.target.value }))}
                                className="form-input border border-gray-300 rounded px-2 py-1 w-full"
                            />
                        </FormRow>

                        <FormRow label="วันที่ได้รับ (พ.ศ.)">
                            <div className="relative w-full flex items-center">
                                <input
                                    type="date"
                                    value={form.receivedDateBE}
                                    onChange={(e) => setForm(s => ({ ...s, receivedDateBE: e.target.value }))}
                                    placeholder="2568-01-01"
                                    className="form-input border border-gray-300 rounded px-2 py-1 w-full "
                                    required
                                />
                            </div>
                        </FormRow>

                        <FormRow label="สถานะ">
                            <input value="ปกติ" readOnly className="form-input bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full" />
                        </FormRow>

                        <div className="flex justify-center gap-4 mt-6">
                            <button type="submit" className="bg-BlueLight hover:bg-[#70a8b6] text-White px-4 py-2 rounded-md">
                                เพิ่มข้อมูล
                            </button>
                            <button type="button" className="bg-RedLight hover:bg-red-600 text-White px-4 py-2 rounded-md" onClick={onClose}>
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-4">
        <label className="w-32 font-medium text-gray-700">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ใช้สำหรับ default value ให้ input type="date" (ค.ศ.)
const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

// แปลง ค.ศ. <-> พ.ศ. (YYYY-MM-DD)
const ceToThai = (ymdCE: string) => {
    if (!ymdCE) return ymdCE;
    const [y, m, d] = ymdCE.split("-");
    if (!y || !m || !d) return ymdCE;
    return `${String(Number(y) + 543).padStart(4, "0")}-${m}-${d}`;
};
const thaiToCE = (ymdBE: string) => {
    if (!ymdBE) return ymdBE;
    const [y, m, d] = ymdBE.split("-");
    if (!y || !m || !d) return ymdBE;
    return `${String(Number(y) - 543).padStart(4, "0")}-${m}-${d}`;
};

type Me = {
    fullName: string;
    role: "ADMIN" | "INTERNAL" | "EXTERNAL";
    phone?: string | null;
    department?: { id: number; name: string } | null;
};

interface CartItem {
    id: number;
    code: string;
    name: string;
    category: string;
    quantity: number;

    onClose?: () => void;
    onBorrow?: (borrowData: {
        returnDue: string;   // ควรเป็น YYYY-MM-DD
        reason: string;
        borrowerName?: string;
        department?: string | null;
    }) => void;
    onSuccess?: () => void;
    selectedEquipment?: {
        id: number;
        code: string;
        name: string;
        category: string;
    } | null;
    cartItems?: CartItem[];
}


type BorrowKaruphanProps = {
    onClose?: () => void;
    onBorrow?: (borrowData: {
        external: { name: string; dept: string; phone: string } | null;
        notes: null;
        returnDue: string;
        reason: string;
        borrowerName?: string;
        department?: string | null;
    }) => void;
    onSuccess?: () => void;
    selectedEquipment?: {
        id: number;
        code: string;
        name: string;
        category: string;
    } | null;
    cartItems?: CartItem[];
};

const BorrowKaruphan = ({ onClose, onBorrow, onSuccess, selectedEquipment, cartItems }: BorrowKaruphanProps) => {
    const router = useRouter();
    const [me, setMe] = useState<Me | null>(null);
    // ใช้ state แสดง/รับค่าเป็น พ.ศ. (string)
    const [borrowDateBE, setBorrowDateBE] = useState<string>(ceToThai(toInputDate(new Date())));
    const [returnDateBE, setReturnDateBE] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    async function fetchMe() {
        try {
            const r = await fetch(`/api/users/me?t=${Date.now()}`, { cache: "no-store" });
            const j = await r.json().catch(() => ({}));
            if (r.ok && j?.ok && j.user) setMe(j.user as Me);
        } catch { }
    }

    useEffect(() => {
        fetchMe();
        const h = () => fetchMe(); // อัปเดตทันทีหลังผู้ใช้แก้โปรไฟล์
        window.addEventListener("me:updated", h);
        return () => window.removeEventListener("me:updated", h);
    }, []);

    const deptText =
        me?.department?.name ??
        (me?.role === "EXTERNAL" ? "บุคคลภายนอก" : "-");

    const handleClose = () => onClose?.();

    // เพิ่มฟังก์ชัน handleBorrow สำหรับการส่งคำขอยืม
    async function handleBorrow({ borrowDate, returnDue, reason }: { borrowDate: string; returnDue: string; reason: string }) {
        if (!cartItems || cartItems.length === 0) {
            alert("ไม่มีรายการในตะกร้า");
            return;
        }
        const items = cartItems.map(ci => ({
            equipmentId: ci.id,
            quantity: Number(ci.quantity ?? 1),
        }));
        const borrowerType: "INTERNAL" | "EXTERNAL" = me?.role === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
        let body: any = {
            borrowerType,
            borrowDate,
            returnDue,
            reason: reason?.trim() || null,
            items,
        };
        if (borrowerType === "EXTERNAL") {
            body.externalName = me?.fullName?.trim() || null;
            body.externalDept = me?.department?.name?.trim() || null;
            body.externalPhone = me?.phone?.toString().trim() || null;
        } else if (borrowerType === "INTERNAL" && me) {
            body.requesterId = (me as any).id ?? null;
        }
        try {
            setSubmitting(true);
            const res = await fetch("/api/borrow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok || !j?.ok) {
                alert(typeof j?.error === "string" ? j.error : "บันทึกไม่สำเร็จ");
                setSubmitting(false);
                return;
            }

            // 👉 สำเร็จ: ปิดโมดอล + เคลียร์ตะกร้า (ให้ parent ทำ) + รีเฟรชหน้า
            window.dispatchEvent(new Event("cart:clear")); // ถ้า parent ฟัง event นี้อยู่
            onSuccess?.();
            onClose?.();
            router.refresh();
        } catch {
            alert("เกิดข้อผิดพลาดในการส่งคำขอยืม");
        } finally {
            setSubmitting(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!borrowDateBE || !returnDateBE) return;

        // ❗ถ้า parent ส่ง onBorrow มา ให้เรียกอันนั้น (parent จะเคลียร์ตะกร้า/รีโหลดเอง)
        const borrowerType: "INTERNAL" | "EXTERNAL" = me?.role === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
        if (onBorrow) {
            try {
                setSubmitting(true);
                onBorrow({
                    external: borrowerType === "EXTERNAL"
                        ? {
                            name: me?.fullName ?? "",
                            dept: me?.department?.name ?? "",
                            phone: me?.phone ?? "",
                        }
                        : null,
                    notes: null,
                    // ✅ แปลง พ.ศ. -> ค.ศ. ก่อนส่งให้ parent
                    returnDue: thaiToCE(returnDateBE),
                    reason,
                    // (ถ้า parent ต้องการ แถมชื่อ/แผนกไปให้ด้วยได้)
                    borrowerName: me?.fullName,
                    department: me?.department?.name ?? null,
                });
                onSuccess?.();
                onClose?.();
            } finally {
                setSubmitting(false);
            }
            return;
        }

        // fallback เดิม: ยิง API ในโมดอลเอง (กรณีเรียกใช้โมดอลแบบ standalone)
        await handleBorrow({ borrowDate: thaiToCE(borrowDateBE), returnDue: thaiToCE(returnDateBE), reason });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-md w-[90%] md:w-[600px] max-h-[90vh] overflow-y-auto">
                <div className="w-full flex justify-end mb-4">
                    <button onClick={handleClose} aria-label="Close form">
                        <Image src="/Close.png" alt="Close" width={30} height={30} />
                    </button>
                </div>

                <div className="flex justify-center items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">รายการยืมที่ต้องการ</h2>
                </div>

                {/* ตารางแสดงรายการครุภัณฑ์ที่เลือก */}
                <div className="mb-6">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-red-300">
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ลำดับ</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ชื่อครุภัณฑ์</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">ยี่ห้อ/รุ่น/แบบ</th>
                                <th className="border border-gray-300 px-4 py-2 text-center font-medium">จำนวน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems && cartItems.length > 0 ? (
                                cartItems.map((item: CartItem, index: number) => (
                                    <tr key={item.id}>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.name}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.category}</td>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {selectedEquipment?.name || "ชื่อครุภัณฑ์"}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">
                                        {selectedEquipment?.category || "ยี่ห้อ/รุ่น/แบบ"}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">1</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ฟอร์มหลัก */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                    <FormRow label="วันที่ยืม (พ.ศ.)">
                        <input
                            type="date"
                            value={borrowDateBE}
                            onChange={e => {
                                let v = e.target.value;
                                if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                                    const [y, m, d] = v.split("-");
                                    if (Number(y) < 2500) v = ceToThai(v);
                                }
                                setBorrowDateBE(v);
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-700"
                            placeholder="2568-09-11"
                            required
                        />
                    </FormRow>

                    <FormRow label="กำหนดคืน (พ.ศ.)">
                        <input
                            type="date"
                            value={returnDateBE}
                            onChange={e => {
                                let v = e.target.value;
                                if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                                    const [y, m, d] = v.split("-");
                                    if (Number(y) < 2500) v = ceToThai(v);
                                }
                                setReturnDateBE(v);
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-700"
                            placeholder="2568-09-11"
                            required
                        />
                    </FormRow>

                    <FormRow label="เหตุผลที่ยืม">
                        <textarea
                            placeholder="ระบุเหตุผล"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="form-input border border-gray-300 rounded px-3 py-2 w-full min-h-[100px] resize-vertical"
                            required
                        />
                    </FormRow>

                    {/* แสดงชื่อผู้ยืม/กลุ่มงานจากบัญชีจริง */}
                    <FormRow label="ชื่อผู้ยืม">
                        <input
                            value={me?.fullName ?? "-"}
                            readOnly
                            className="form-input border border-gray-200 rounded px-3 py-2 w-full bg-gray-100 text-gray-700"
                            data-testid="borrower-name"
                        />
                    </FormRow>

                    <FormRow label="กลุ่มงาน">
                        <input
                            value={deptText}
                            readOnly
                            className="form-input border border-gray-200 rounded px-3 py-2 w-full bg-gray-100 text-gray-700"
                        />
                    </FormRow>

                    <div className="flex justify-center gap-4 mt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-BlueLight hover:bg-Green disabled:opacity-50 text-white px-6 py-2 rounded-md font-medium"
                        >
                            {submitting ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                        <button
                            type="button"
                            className="bg-RedLight hover:bg-Red text-white px-6 py-2 rounded-md font-medium transition-colors"
                            onClick={handleClose}
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <label className="w-32 font-medium text-gray-700 pt-2">{label}</label>
        <div className="flex-1">{children}</div>
    </div>
);

export default BorrowKaruphan;

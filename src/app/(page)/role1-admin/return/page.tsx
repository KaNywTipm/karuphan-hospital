"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ---------- helpers ---------- */
// แปลงวัน ค.ศ. -> yyyy-MM-dd (พ.ศ.) สำหรับ <input type="date">
const isoToBE = (iso?: string | null) => {
    if (!iso) {
        const d = new Date();
        return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
        ).padStart(2, "0")}`;
    }
    const d = new Date(iso);
    return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
};
// yyyy-MM-dd(พ.ศ.) -> yyyy-MM-dd(ค.ศ.)
const beToCE = (be: string) => {
    if (!be) return "";
    const [y, m, d] = be.split("-");
    return `${Number(y) - 543}-${m}-${d}`;
};
// แสดงวันที่แบบไทย
const fmt = (d?: string | null) => {
    if (!d) return "-";
    try {
        return new Date(d).toLocaleDateString("th-TH");
    } catch {
        return "-";
    }
};

/* ---------- types ---------- */
type Equipment = { code?: string; number?: number; name?: string };
type BorrowItem = { id: number; equipment?: Equipment; returnCondition?: string };
type BorrowRequest = {
    id: number;
    borrowerType: "INTERNAL" | "EXTERNAL";
    status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
    requestedAt?: string | null;
    createdAt?: string | null;
    requestDate?: string | null;
    returnDue?: string | null;
    actualReturnDate?: string | null;
    reason?: string | null;
    notes?: string | null;
    requester?: { fullName?: string; department?: { name?: string } | null } | null;
    externalName?: string | null;
    externalDept?: string | null;
    items?: BorrowItem[];
    receivedBy?: { fullName?: string } | null;
    approvedBy?: { fullName?: string } | null;
};

export default function ReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const [borrowRequest, setBorrowRequest] = useState<BorrowRequest | null>(null);
    // it.id -> condition
    const [returnConditions, setReturnConditions] = useState<Record<number, string>>({});
    const [returnNotes, setReturnNotes] = useState("");
    const [actualReturnDate, setActualReturnDate] = useState<string>(isoToBE(null));
    const [loading, setLoading] = useState(true);

    // ตัวเลือกสภาพคืน
    const RETURN_OPTIONS = [
        { value: "NORMAL", label: "ปกติ" },
        { value: "BROKEN", label: "ชำรุด" },
        { value: "LOST", label: "สูญหาย" },
        { value: "WAIT_DISPOSE", label: "รอจำหน่าย" },
        { value: "DISPOSED", label: "จำหน่ายแล้ว" },
    ];

    // โหลดคำขอ (และ preload returnCondition ที่เคยบันทึกไว้)
    useEffect(() => {
        if (!id || !Number.isFinite(id)) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const r = await fetch(`/api/borrow/${id}`, { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                if (r.ok && j?.ok) {
                    const data: BorrowRequest = j.data;
                    setBorrowRequest(data);
                    setActualReturnDate(isoToBE(data.actualReturnDate));

                    if (Array.isArray(data?.items)) {
                        const rc: Record<number, string> = {};
                        data.items.forEach((it: any) => {
                            if (it.returnCondition && it.id) rc[it.id] = it.returnCondition;
                        });
                        setReturnConditions(rc);
                    }
                } else {
                    alert(j?.error ?? "โหลดคำขอไม่สำเร็จ");
                }
            } catch {
                alert("โหลดคำขอไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    // ผู้ยืม/หน่วยงาน
    const { borrowerName, department } = useMemo(() => {
        const r = borrowRequest;
        if (!r) return { borrowerName: "-", department: "-" };
        if (r.borrowerType === "INTERNAL") {
            return {
                borrowerName: r.requester?.fullName ?? "-",
                department: r.requester?.department?.name ?? "-",
            };
        }
        return {
            borrowerName: r.externalName || r.requester?.fullName || "-",
            department: r.externalDept || "ภายนอกกลุ่มงาน",
        };
    }, [borrowRequest]);

    // วันเกินกำหนด
    const overdueDays = useMemo(() => {
        try {
            if (!borrowRequest?.returnDue) return 0;
            const due = new Date(borrowRequest.returnDue).getTime();
            const actIso = beToCE(actualReturnDate) || new Date().toISOString();
            const act = new Date(actIso).getTime();
            const diff = Math.floor((act - due) / (1000 * 60 * 60 * 24));
            return diff > 0 ? diff : 0;
        } catch {
            return 0;
        }
    }, [borrowRequest?.returnDue, actualReturnDate]);

    // บันทึกรับคืน
    const handleReturn = async () => {
        if (!borrowRequest) return;

        const items = borrowRequest.items || [];
        const missing = items.some((it: any) => !returnConditions[it.id]);
        if (missing) return alert("กรุณาเลือกสภาพคืนให้ครบทุกชิ้น");

        try {
            const payload = {
                actualReturnDate: beToCE(actualReturnDate) || null,
                returnNotes,
                returnConditions: items.map((it: any) => ({
                    equipmentId: it.equipment?.number, // หรือ it.equipment?.id หาก API ใช้ id
                    condition: returnConditions[it.id],
                })),
            };

            const r = await fetch(`/api/borrow/${id}/return`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert(j?.error ?? "บันทึกรับคืนไม่สำเร็จ");

            router.push("/role1-admin");
        } catch {
            alert("บันทึกรับคืนไม่สำเร็จ");
        }
    };

    const handleCancel = () => router.push("/role1-admin");

    if (loading)
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto" />
                    <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );

    if (!borrowRequest) return <div className="p-6">ไม่พบคำขอ</div>;

    const adminName =
        borrowRequest?.receivedBy?.fullName ??
        borrowRequest?.approvedBy?.fullName ??
        "ผู้ดูแลระบบ";

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gray-300 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800">
                    รายการยืมครุภัณฑ์-ผู้ดูแลระบบครุภัณฑ์
                </h1>
            </div>

            {/* Main */}
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            รายการยืมรอคืน #{borrowRequest.id}
                        </h2>

                        {/* ตารางครุภัณฑ์ */}
                        <div className="mb-6 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-red-300">
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            ลำดับ
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            เลขครุภัณฑ์
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            ชื่อครุภัณฑ์
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">
                                            สภาพคืน
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(borrowRequest.items ?? []).map((it, idx) => {
                                        const code =
                                            it.equipment?.code ??
                                            (it.equipment?.number != null ? String(it.equipment.number) : "-");
                                        return (
                                            <tr key={it.id}>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                    {idx + 1}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                    {code}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                    {it.equipment?.name ?? "-"}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                    <select
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        value={returnConditions[it.id] || ""}
                                                        onChange={(e) =>
                                                            setReturnConditions((rc) => ({ ...rc, [it.id]: e.target.value }))
                                                        }
                                                    >
                                                        <option value="">เลือกสภาพ</option>
                                                        {RETURN_OPTIONS.map((s) => (
                                                            <option key={s.value} value={s.value}>
                                                                {s.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ข้อมูลประกอบ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div>วันที่ยืม {fmt(borrowRequest.requestedAt || borrowRequest.createdAt || borrowRequest.requestDate)}</div>
                                <div>
                                    กำหนดคืน {fmt(borrowRequest.returnDue)}
                                    {overdueDays > 0 && (
                                        <span className="ml-2 inline-block text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs">
                                            คืนเกินกำหนด {overdueDays} วัน
                                        </span>
                                    )}
                                </div>
                                <div>บุคลากร {department}</div>
                                <div>ผู้ยืม {borrowerName}</div>
                                <div>เหตุผลที่ยืม {borrowRequest.reason ?? "-"}</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        วันที่คืน
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={actualReturnDate}
                                        onChange={(e) => setActualReturnDate(e.target.value)}
                                        placeholder="2568-01-01"
                                    />
                                    {overdueDays > 0 && (
                                        <p className="mt-1 text-xs text-red-600">คืนเกินกำหนด {overdueDays} วัน</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        เหตุผลที่คืน
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder="ระบุเหตุผลหรือหมายเหตุ..."
                                        value={returnNotes}
                                        onChange={(e) => setReturnNotes(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ผู้รับคืน
                                    </label>
                                    <div className="bg-gray-200 rounded px-3 py-2 text-sm text-gray-700">
                                        {adminName}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ปุ่ม */}
                        <div className="flex justify-start gap-4">
                            <button
                                onClick={handleReturn}
                                disabled={(borrowRequest.items ?? []).some((it) => !returnConditions[it.id])}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${(borrowRequest.items ?? []).every((it) => returnConditions[it.id])
                                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                            >
                                บันทึก
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

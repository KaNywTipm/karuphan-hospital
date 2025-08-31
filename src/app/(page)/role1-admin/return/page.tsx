"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Status from "@/components/dropdown/Status";

// แปลงวัน ค.ศ. -> yyyy-MM-dd(พ.ศ.) สำหรับ input[type=date]
const isoToBE = (iso?: string | null) => {
    if (!iso) {
        const d = new Date();
        return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = new Date(iso);
    return `${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// yyyy-MM-dd(พ.ศ.) -> yyyy-MM-dd(ค.ศ.)
const beToCE = (be: string) => {
    if (!be) return "";
    const [y, m, d] = be.split("-");
    return `${Number(y) - 543}-${m}-${d}`;
};

export default function ReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const [borrowRequest, setBorrowRequest] = useState<any>(null);
    const [selectedStatus, setSelectedStatus] = useState<any>(null);
    const [returnNotes, setReturnNotes] = useState("");
    const [actualReturnDate, setActualReturnDate] = useState<string>(isoToBE(null));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !Number.isFinite(id)) { setLoading(false); return; }
        (async () => {
            try {
                const r = await fetch(`/api/borrow/${id}`, { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                if (r.ok && j?.ok) {
                    setBorrowRequest(j.data);
                    // ถ้ามี actualReturnDate เดิม → แปลงขึ้น input
                    setActualReturnDate(isoToBE(j.data.actualReturnDate));
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

    const handleReturn = async () => {
        if (!borrowRequest || !selectedStatus) return;
        try {
            const r = await fetch(`/api/borrow/${id}/return`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    actualReturnDate: beToCE(actualReturnDate),
                    returnCondition: selectedStatus.label, // "ปกติ", "ชำรุด", "สูญหาย", "รอจำหน่าย", "จำหน่ายแล้ว" -> map ใน API แล้ว
                    returnNotes,
                }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert(j?.error ?? "บันทึกรับคืนไม่สำเร็จ");
            router.push("/role1-admin"); // กลับไปแท็บ "คืนแล้ว" ได้ตามที่หน้า list จัดการ
        } catch {
            alert("บันทึกรับคืนไม่สำเร็จ");
        }
    };

    const handleCancel = () => router.push("/role1-admin");

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }
    if (!borrowRequest) {
        return <div className="p-6">ไม่พบคำขอ</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gray-300 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800">
                    รายการยืมครุภัณฑ์-ผู้ดูแลระบบครุภัณฑ์
                </h1>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            รายการยืมรอคืน #{borrowRequest.id}
                        </h2>

                        {/* Equipment Table (ดีไซน์เดิม) */}
                        <div className="mb-6">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-red-300">
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">ลำดับ</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">ชื่อครุภัณฑ์</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">กำหนดคืน</th>
                                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">สภาพ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {borrowRequest.items.map((it: any, idx: number) => (
                                        <tr key={it.number}>
                                            <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{it.name}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                {borrowRequest.returnDue
                                                    ? new Date(borrowRequest.returnDue).toLocaleDateString("th-TH")
                                                    : "-"}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                                                <select
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    value={selectedStatus?.id || ""}
                                                    onChange={(e) => {
                                                        const id = parseInt(e.target.value);
                                                        const status = Status[0].items.find(s => s.id === id);
                                                        setSelectedStatus(status ?? null);
                                                    }}
                                                >
                                                    <option value="">เลือกสภาพ</option>
                                                    {Status[0].items.map(s => (
                                                        <option key={s.id} value={s.id}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ข้อมูลประกอบ (ดีไซน์เดิม) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div>วันที่ยืม {borrowRequest.borrowDate ? new Date(borrowRequest.borrowDate).toLocaleDateString("th-TH") : "ไม่ระบุ"}</div>
                                <div>กำหนดคืน {borrowRequest.returnDue ? new Date(borrowRequest.returnDue).toLocaleDateString("th-TH") : "-"}</div>
                                <div>บุคลากร {borrowRequest.department}</div>
                                <div>ผู้ยืม {borrowRequest.borrowerName}</div>
                                <div>เหตุผลที่ยืม {borrowRequest.reason ?? "-"}</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่คืน</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={actualReturnDate}
                                        onChange={(e) => setActualReturnDate(e.target.value)}
                                        placeholder="2568-01-01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เหตุผลคืน</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder="ระบุเหตุผลหรือหมายเหตุ..."
                                        value={returnNotes}
                                        onChange={(e) => setReturnNotes(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับคืน</label>
                                    <div className="bg-gray-200 rounded px-3 py-2 text-sm text-gray-700">
                                        {/* ชื่อผู้รับคืนจริงจะมาจาก session ฝั่ง API บันทึกเป็น receivedById อยู่แล้ว */}
                                        เจ้าหน้าที่ผู้รับคืน
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ปุ่ม */}
                        <div className="flex justify-start gap-4">
                            <button
                                onClick={handleReturn}
                                disabled={!selectedStatus}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedStatus ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
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

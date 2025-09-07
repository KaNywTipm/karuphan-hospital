"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// แปลงวันที่ ISO -> แสดงแบบไทย
const fmtTH = (iso?: string | null) => {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
    } catch { return "-"; }
};

export default function ApprovePage() {
    const router = useRouter();
    const search = useSearchParams();
    const id = Number(search.get("id"));

    const [loading, setLoading] = useState(true);
    const [row, setRow] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        if (!id || !Number.isFinite(id)) { setLoading(false); return; }
        (async () => {
            try {
                const r = await fetch(`/api/borrow/${id}`, { cache: "no-store" });
                const j = await r.json().catch(() => ({}));
                if (r.ok && j?.ok) setRow(j.data);
                else alert(j?.error ?? "โหลดคำขอไม่สำเร็จ");
            } catch {
                alert("โหลดคำขอไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    async function onApprove() {
        try {
            const r = await fetch(`/api/borrow/${id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert(j?.error ?? "อนุมัติไม่สำเร็จ");
            router.push("/role1-admin");
        } catch { alert("อนุมัติไม่สำเร็จ"); }
    }

    async function onReject() {
        if (!rejectReason.trim()) return alert("กรุณากรอกเหตุผลไม่อนุมัติ");
        try {
            const r = await fetch(`/api/borrow/${id}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectReason }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert(j?.error ?? "ไม่อนุมัติไม่สำเร็จ");
            router.push("/role1-admin");
        } catch { alert("ไม่อนุมัติไม่สำเร็จ"); }
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
        </div>
    );
    if (!row) return <div className="p-6">ไม่พบคำขอ</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-gray-300 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800">รายการยืมครุภัณฑ์-ผู้ดูแลระบบครุภัณฑ์</h1>
            </div>

            {/* Main */}
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            อนุมัติคำขอ #{row.id}
                        </h2>

                        {/* รายละเอียดคำขอ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div><span className="font-medium">ผู้ขอ:</span> {row.borrowerName}</div>
                                <div><span className="font-medium">หน่วยงาน:</span> {row.department}</div>
                                <div><span className="font-medium">ครุภัณฑ์:</span> {row.items.map((i: any) => i.name).join(", ")}</div>
                                <div><span className="font-medium">เหตุผลการยืม:</span> {row.reason || "-"}</div>
                            </div>
                            <div className="space-y-4">
                                <div><span className="font-medium">วันที่ยืม:</span> {fmtTH(row.borrowDate)}</div>
                                <div><span className="font-medium">กำหนดคืน:</span> {fmtTH(row.returnDue)}</div>
                            </div>
                        </div>

                        {/* ปุ่ม/อินพุตเหตุผลไม่อนุมัติ */}
                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                            <button onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">
                                อนุมัติ
                            </button>
                            <button onClick={onReject} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
                                ไม่อนุมัติ
                            </button>
                            <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="เหตุผลไม่อนุมัติ"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

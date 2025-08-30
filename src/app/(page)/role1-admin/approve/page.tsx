"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ApprovePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [row, setRow] = useState<any>(null);
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const r = await fetch("/api/borrow", { cache: "no-store" });
            const j = await r.json();
            const found = (j?.data ?? []).find((x: any) => x.id === Number(id));
            setRow(found ?? null); setLoading(false);
        })();
    }, [id]);

    async function approve() {
        const r = await fetch(`/api/borrow/${id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        const j = await r.json();
        if (j.ok) router.push("/role1-admin"); else alert(JSON.stringify(j.error));
    }

    async function reject() {
        if (!reason.trim()) return alert("กรอกเหตุผล");
        const r = await fetch(`/api/borrow/${id}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejectReason: reason }) });
        const j = await r.json();
        if (j.ok) router.push("/role1-admin"); else alert(JSON.stringify(j.error));
    }

    if (loading) return <div className="p-4">กำลังโหลด...</div>;
    if (!row) return <div className="p-4">ไม่พบคำขอ</div>;

    return (
        <div className="p-4 space-y-4 max-w-2xl">
            <h1 className="text-lg font-semibold">อนุมัติคำขอ #{row.id}</h1>
            <div className="border rounded p-3 text-sm space-y-1">
                <div>ผู้ขอ: {row.borrowerName}</div>
                <div>หน่วยงาน: {row.department}</div>
                <div>ครุภัณฑ์: {row.equipmentName}</div>
                <div>กำหนดคืน: {new Date(row.returnDue).toLocaleDateString()}</div>
                <div>เหตุผลการยืม: {row.reason || "-"}</div>
            </div>

            <div className="flex gap-2">
                <button onClick={approve} className="bg-green-600 text-white px-4 py-2 rounded">อนุมัติ</button>
                <input value={reason} onChange={e => setReason(e.target.value)} className="border rounded px-3 py-2 flex-1" placeholder="เหตุผลไม่อนุมัติ (ถ้าไม่อนุมัติ)" />
                <button onClick={reject} className="bg-red-600 text-white px-4 py-2 rounded">ไม่อนุมัติ</button>
            </div>
        </div>
    );
}

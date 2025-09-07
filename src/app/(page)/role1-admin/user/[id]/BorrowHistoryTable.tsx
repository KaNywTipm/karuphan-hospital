"use client";
import { useEffect, useMemo, useState } from "react";

type Item = { equipment: { number: number; name: string }; quantity: number };
type Row = { id: number; status: string; requestedAt: string; approvedAt?: string | null; items: Item[] };

export default function BorrowHistoryTable({ userId }: { userId: number }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [status, setStatus] = useState<string>("");

    useEffect(() => {
        const url = new URL(`/api/borrow/history/${userId}`, window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", "10");
        if (status) url.searchParams.set("status", status);

        fetch(url.toString(), { credentials: "include" })
            .then(r => r.json())
            .then(json => {
                setRows(Array.isArray(json?.data?.rows) ? json.data.rows : []);
                setTotalPages(Number(json?.data?.totalPages ?? 1));
            })
            .catch(() => {
                setRows([]);
                setTotalPages(1);
            });
    }, [userId, page, status]);

    const statusClass = (s: string) =>
    ({
        PENDING: "bg-amber-100 text-amber-700",
        APPROVED: "bg-green-100 text-green-700",
        REJECTED: "bg-red-100 text-red-700",
        CANCELED: "bg-gray-100 text-gray-700",
        RETURNED: "bg-blue-100 text-blue-700",
    }[s] ?? "bg-gray-100 text-gray-700");

    return (
        <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-semibold">ประวัติการยืม</h2>
                <select
                    value={status}
                    onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                    className="ml-auto border rounded px-2 py-1 text-sm"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="PENDING">รออนุมัติ</option>
                    <option value="APPROVED">อนุมัติแล้ว</option>
                    <option value="REJECTED">ปฏิเสธ</option>
                    <option value="RETURNED">คืนแล้ว</option>
                    <option value="CANCELED">ยกเลิก</option>
                </select>
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left bg-gray-50">
                        <th className="p-2">เลขคำขอ</th>
                        <th className="p-2">วันที่ขอ</th>
                        <th className="p-2">สถานะ</th>
                        <th className="p-2">รายการ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className="border-t">
                            <td className="p-2">{r.id}</td>
                            <td className="p-2">{new Date(r.requestedAt).toLocaleString()}</td>
                            <td className="p-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="p-2">
                                {r.items.map((it, idx) => (
                                    <div key={idx}>
                                        {it.equipment.number} — {it.equipment.name} × {it.quantity}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-500">ไม่มีข้อมูล</td></tr>
                    )}
                </tbody>
            </table>

            <div className="flex items-center justify-end gap-2 mt-3">
                <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                >ก่อนหน้า</button>
                <span className="text-sm">หน้า {page} / {totalPages}</span>
                <button
                    className="px-2 py-1 border rounded disabled:opacity-50"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                >ถัดไป</button>
            </div>
        </div>
    );
}

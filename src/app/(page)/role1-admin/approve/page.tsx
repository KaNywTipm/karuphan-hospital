"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModal } from "@/components/Modal-Notification/ModalProvider";

// ให้หน้ารันแบบ dynamic เวลา export
export const dynamic = "force-dynamic";

// แปลงวันที่ ISO -> ไทย
const fmtTH = (iso?: string | null) => {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return "-";
    }
};

function ApprovePageInner() {
    const { alert } = useModal();
    const router = useRouter();
    const search = useSearchParams();
    const id = Number(search.get("id"));

    const [loading, setLoading] = useState(true);
    const [row, setRow] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState("");

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
                    const d = j.data;
                    // สรุปชื่อ/หน่วยงานตามประเภท
                    let borrowerName = "-";
                    let department = "-";
                    if (d.borrowerType === "INTERNAL") {
                        borrowerName = d.requester?.fullName ?? "-";
                        department = d.requester?.department?.name ?? "-";
                    } else if (d.borrowerType === "EXTERNAL") {
                        borrowerName = d.externalName || d.requester?.fullName || "-";
                        department = d.externalDept || "ภายนอกกลุ่มงาน";
                    }
                    const shaped = {
                        ...d,
                        borrowerName,
                        department,
                        items: (d.items ?? [])
                            .map((it: any) => it.equipment)
                            .filter(Boolean),
                    };
                    setRow(shaped);
                } else alert.error(j?.error ?? "ไม่สามารถโหลดข้อมูลคำขอได้ กรุณาลองใหม่อีกครั้ง");
            } catch {
                alert.error("ไม่สามารถโหลดข้อมูลคำขอได้ กรุณาตรวจสอบการเชื่อมต่อ");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function onApprove() {
        try {
            const r = await fetch(`/api/borrow/${id}/approve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert.error(j?.error ?? "ไม่สามารถอนุมัติคำขอได้ กรุณาลองใหม่อีกครั้ง");

            // แสดงข้อความสำเร็จที่ละเอียดขึ้น
            const successMessage = j?.message || "อนุมัติคำขอเรียบร้อยแล้ว";
            alert.success(successMessage);
            router.push("/role1-admin");
        } catch {
            alert.error("ไม่สามารถอนุมัติคำขอได้ กรุณาตรวจสอบการเชื่อมต่อ");
        }
    }

    async function onReject() {
        if (!rejectReason.trim()) return alert.warning("กรุณากรอกเหตุผลไม่อนุมัติ");
        try {
            const r = await fetch(`/api/borrow/${id}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectReason }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j?.ok) return alert.error(j?.error ?? "ไม่สามารถไม่อนุมัติคำขอได้ กรุณาลองใหม่อีกครั้ง");

            // แสดงข้อความสำเร็จที่ละเอียดขึ้น
            const successMessage = j?.message || "ไม่อนุมัติคำขอเรียบร้อยแล้ว";
            alert.success(successMessage);
            router.push("/role1-admin");
        } catch {
            alert.error("ไม่สามารถไม่อนุมัติคำขอได้ กรุณาตรวจสอบการเชื่อมต่อ");
        }
    }

    if (loading)
        return (
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
            <div className="bg-gray-300 px-6 py-4">
                <h1 className="text-xl font-semibold text-gray-800">
                    รายการยืมครุภัณฑ์-ผู้ดูแลระบบครุภัณฑ์
                </h1>
            </div>

            <div className="p-6">
                <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
                    <div className="bg-white rounded-t-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            อนุมัติคำขอ #{row.id}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">ผู้ขอ:</span> {row.borrowerName}
                                </div>
                                <div>
                                    <span className="font-medium">หน่วยงาน:</span> {row.department}
                                </div>
                                <div>
                                    <span className="font-medium">ครุภัณฑ์:</span>{" "}
                                    {row.items.map((i: any) => i?.name).join(", ")}
                                </div>
                                <div>
                                    <span className="font-medium">เหตุผลการยืม:</span>{" "}
                                    {row.reason || "-"}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">วันที่ยืม:</span>{" "}
                                    {row.actualBorrowDate ? fmtTH(row.actualBorrowDate) : fmtTH(new Date().toISOString())}
                                </div>
                                <div>
                                    <span className="font-medium">กำหนดคืน:</span>{" "}
                                    {fmtTH(row.returnDue)}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                            <button
                                onClick={onApprove}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                            >
                                อนุมัติ
                            </button>
                            <button
                                onClick={onReject}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                            >
                                ไม่อนุมัติ
                            </button>
                            <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="กรอกเหตุผลที่ไม่อนุมัติ"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ห่อด้วย Suspense เพื่อผ่าน build/export
export default function ApprovePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    กำลังโหลด...
                </div>
            }
        >
            <ApprovePageInner />
        </Suspense>
    );
}

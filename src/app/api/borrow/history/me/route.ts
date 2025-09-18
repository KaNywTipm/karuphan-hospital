import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

import type { BorrowStatus } from "@prisma/client";

function buildStatusWhere(params: URLSearchParams) {
    const only = params.get("only");
    const exclude = params.get("exclude");
    const status = params.get("status");

    if (only === "pending") return { status: "PENDING" as BorrowStatus };
    if (exclude === "pending") return { NOT: { status: "PENDING" as BorrowStatus } };
    if (status) return { status: status as BorrowStatus };
    return {};
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
        }
        const userId = Number(session.user.id);
        const url = new URL(req.url);

        const where = {
            requesterId: userId,                // ✅ schema ใช้ requesterId
            ...buildStatusWhere(url.searchParams),
        };

        const rows = await prisma.borrowRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },     // “วันที่ยืม” = วันที่ส่งคำขอ
            include: {
                items: {
                    include: {
                        equipment: { select: { number: true, code: true, name: true } },
                    },
                },
                approvedBy: { select: { fullName: true } },
                receivedBy: { select: { fullName: true } },
            },
        });

        // 🔥 สัญญา API: flatten เสมอ เอา “ชิ้นแรก” ออกมาแสดง (ถ้ามีหลายชิ้นคุณจะนับ/รวมเองก็ได้)
        const data = rows.map((r) => {
            const e = r.items?.[0]?.equipment;
            const equipmentCode = e?.code ?? (e?.number != null ? String(e.number) : "-");
            const equipmentName = e?.name ?? "-";
            return {
                id: r.id,
                status: r.status,
                borrowDate: r.createdAt,                    // ใช้แสดงเป็น “วันที่ยืม”
                returnDue: r.returnDue ?? null,
                actualReturnDate: r.actualReturnDate ?? null,
                reason: r.reason ?? r.notes ?? r.rejectReason ?? null,
                equipmentCode,                               // ✅ flatten
                equipmentName,                               // ✅ flatten
                approverOrReceiver:
                    r.approvedBy?.fullName || r.receivedBy?.fullName || "System Admin",
                itemsCount: r.items?.length ?? 0,            // เผื่ออยากโชว์ “x รายการ”
            };
        });

        // คืนเป็นอาเรย์ตรง ๆ (UI ฝั่งคุณรองรับรูปแบบนี้)
        return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
        console.error("[/api/borrow/history/me] error:", err);
        return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
    }
}

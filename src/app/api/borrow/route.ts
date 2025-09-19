import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Config / helpers
const ALLOWED_STATUS = new Set(["PENDING", "APPROVED", "RETURNED", "REJECTED"]);
const ALLOWED_BORROWER = new Set(["INTERNAL", "EXTERNAL"]);

function pickStatus(v: string | null | undefined) {
    if (!v) return undefined;
    const s = v.toUpperCase();
    return ALLOWED_STATUS.has(s) ? (s as any) : undefined;
}
function pickBorrower(v: string | null | undefined) {
    if (!v) return undefined;
    const s = v.toUpperCase();
    return ALLOWED_BORROWER.has(s) ? (s as any) : undefined;
}

// GET /api/borrow
export async function GET(req: Request) {
    try {
        const sp = new URL(req.url).searchParams;

        // filter / paging
        const status = pickStatus(sp.get("status")) || undefined;
        const page = Math.max(1, Number(sp.get("page") || "1"));
        const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || "20")));

        const where: any = {};
        if (status) where.status = status;

        const [total, rows] = await prisma.$transaction([
            prisma.borrowRequest.count({ where }),
            prisma.borrowRequest.findMany({
                where,
                orderBy: [{ createdAt: "desc" }],
                select: {
                    id: true,
                    status: true,
                    borrowerType: true,
                    borrowDate: true,
                    returnDue: true,
                    actualReturnDate: true,
                    reason: true,
                    returnNotes: true,

                    externalName: true,
                    externalDept: true,
                    externalPhone: true,

                    requester: {
                        select: {
                            id: true,
                            fullName: true,
                            department: { select: { name: true } },
                        },
                    },
                    approvedBy: { select: { id: true, fullName: true } },
                    receivedBy: { select: { id: true, fullName: true } },
                    rejectedBy: { select: { id: true, fullName: true } },

                    items: {
                        include: {
                            equipment: { select: { number: true, code: true, name: true } },
                        },
                    },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        // คำนวณ flag "เกินกำหนด" แต่ไม่แก้ status
        const now = Date.now();
        const data = rows.map((r) => {
            const isOverdue =
                r.status === "APPROVED" &&
                r.returnDue &&
                new Date(r.returnDue).getTime() < now &&
                !r.actualReturnDate;
            return { ...r, isOverdue };
        });

        return NextResponse.json({ ok: true, page, pageSize, total, data }, { status: 200 });
    } catch (e) {
        console.error("[GET /api/borrow] error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

type PostBody = {
    borrowerType: "INTERNAL" | "EXTERNAL";
    returnDue: string | Date;
    reason?: string | null;
    notes?: string | null;
    externalName?: string | null;
    externalDept?: string | null;
    externalPhone?: string | null;
    items: { equipmentId: number; quantity?: number }[];
};

// POST /api/borrow
export async function POST(req: Request) {
    const me = await auth();
    if (!me)
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json()) as PostBody;

    const borrowerType = pickBorrower(body?.borrowerType) as PostBody["borrowerType"];
    if (!borrowerType)
        return NextResponse.json({ ok: false, error: "invalid-borrowerType" }, { status: 400 });

    if (!Array.isArray(body.items) || body.items.length === 0)
        return NextResponse.json({ ok: false, error: "no-items" }, { status: 400 });

    const equipmentIds = body.items.map((i) => i.equipmentId);

    // 1) กันเคสอุปกรณ์ใช้งานอยู่ (IN_USE) → ห้ามยืมซ้อน
    const eqs = await prisma.equipment.findMany({
        where: { number: { in: equipmentIds } },
        select: { number: true, status: true },
    });
    const busy = eqs.filter((e) => e.status === "IN_USE");
    if (busy.length) {
        return NextResponse.json(
            {
                ok: false,
                error: `อุปกรณ์เลข: ${busy.map((b) => b.number).join(", ")} กำลังถูกยืม`,
            },
            { status: 409 }
        );
    }

    // 2) กัน "คำขอค้าง" ซ้อน (ทั้ง INTERNAL/EXTERNAL) ด้วยการไล่จากฝั่ง BorrowRequest
    const openReq = await prisma.borrowRequest.findFirst({
        where: {
            status: { in: ["PENDING", "APPROVED"] },
            items: {
                some: { equipmentId: { in: equipmentIds } }, // equipmentIds = [id ของอุปกรณ์ที่ขอ]
            },
        },
        select: {
            id: true,
            items: { select: { equipmentId: true }, take: 1 },
        },
    });

    if (openReq) {
        const conflicted = openReq.items[0]?.equipmentId;
        return NextResponse.json(
            { ok: false, error: `มีคำขอค้างสำหรับอุปกรณ์เลข: ${conflicted ?? "ไม่ทราบเลข"}` },
            { status: 409 }
        );
    }

    const isInternal = borrowerType === "INTERNAL";
    const isExternal = borrowerType === "EXTERNAL";

    // สรุป external ข้อมูล (ถ้า EXTERNAL)
    const externalName = isExternal ? body.externalName ?? null : null;
    const externalDept = isExternal ? body.externalDept ?? null : null;
    const externalPhone = isExternal ? body.externalPhone ?? null : null;

    // map user id (ภายใน: จาก session, ภายนอก: เป็น null)
    const requesterId =
        isExternal
            ? null
            : typeof me.user?.id === "number"
                ? me.user.id
                : Number(me.user?.id) || null;

    // สร้างคำขอ + จัดการสถานะอุปกรณ์ใน Transaction เดียว
    const created = await prisma.$transaction(async (tx) => {
        const adminId = 1; // กำหนดผู้อนุมัติ/ผู้รับคืนเป็นผู้ดูแลหลัก

        const reqRow = await tx.borrowRequest.create({
            data: {
                borrowerType,
                requesterId,
                externalName,
                externalDept,
                externalPhone,

                status: isInternal ? "APPROVED" : "PENDING",
                borrowDate: isInternal ? new Date() : null,
                returnDue: new Date(body.returnDue),

                reason: body?.reason ?? null,
                returnNotes: body?.notes ?? null,

                items: {
                    create: body.items.map((it) => ({
                        equipmentId: it.equipmentId,
                        quantity: it.quantity ?? 1,
                    })),
                },

                approvedById: isInternal ? adminId : null,
                receivedById: isInternal ? adminId : null,
                approvedAt: isInternal ? new Date() : null,
            },
            include: { items: true },
        });

        // INTERNAL → ใช้งานทันที
        if (isInternal) {
            await tx.equipment.updateMany({
                where: { number: { in: reqRow.items.map((i) => i.equipmentId) } },
                data: {
                    status: "IN_USE",
                    currentRequestId: reqRow.id,
                    statusChangedAt: new Date(),
                },
            });
        }

        // EXTERNAL → ไม่เปลี่ยนสถานะอุปกรณ์ (คง NORMAL) และไม่ผูก currentRequestId
        // หากอยากรองรับสถานะ "RESERVED" จริง ๆ ค่อยคุยกันเพื่อเพิ่ม enum และปรับ FE ต่อภายหลัง

        return reqRow;
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// CORS preflight (ถ้าใช้)
export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}

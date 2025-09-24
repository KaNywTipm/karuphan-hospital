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
        const pageSize = Math.min(
            100,
            Math.max(1, Number(sp.get("pageSize") || "20"))
        );

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
                            equipment: {
                                select: {
                                    number: true,
                                    code: true,
                                    name: true,
                                    category: { select: { name: true } },
                                },
                            },
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

        return NextResponse.json(
            { ok: true, page, pageSize, total, data },
            { status: 200 }
        );
    } catch (e) {
        console.error("[GET /api/borrow] error:", e);
        return NextResponse.json(
            { ok: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลการยืม" },
            { status: 500 }
        );
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
        return NextResponse.json(
            { ok: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
            { status: 401 }
        );

    const body = await req.json();
    const {
        borrowerType,
        returnDue,
        reason,
        items,
        externalName,
        externalDept,
        externalPhone,
    } = body as PostBody;
    if (!items?.length)
        return NextResponse.json(
            { ok: false, error: "กรุณาเลือกครุภัณฑ์ที่ต้องการยืม" },
            { status: 400 }
        );

    const isInternal = borrowerType === "INTERNAL";
    const isExternal = borrowerType === "EXTERNAL";

    //  requesterId ผูกกับผู้ที่ล็อกอินเสมอ (ทั้ง INTERNAL/EXTERNAL)
    const requesterId =
        typeof me.user?.id === "number" ? me.user.id : Number(me.user?.id) || null;

    // เก็บข้อมูลผู้ยืมภายนอก และ validate สำหรับ EXTERNAL
    let finalExternalName = null,
        finalExternalDept = null,
        finalExternalPhone = null;
    if (isExternal) {
        finalExternalName = externalName?.trim() || null;
        finalExternalDept = externalDept?.trim() || null;
        finalExternalPhone = externalPhone?.trim() || null;

        // Validate: EXTERNAL ต้องมี externalDept
        if (!finalExternalDept) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "กรุณาระบุชื่อหน่วยงานสำหรับผู้ยืมภายนอก",
                },
                { status: 400 }
            );
        }
    }

    const adminId = 1;

    const created = await prisma.$transaction(async (tx) => {
        const reqRow = await tx.borrowRequest.create({
            data: {
                borrowerType,
                requesterId, // ผูกผู้ร้องขอ
                externalName: finalExternalName,
                externalDept: finalExternalDept,
                externalPhone: finalExternalPhone,
                status: isInternal ? "APPROVED" : "PENDING",
                borrowDate: isInternal ? new Date() : null,
                returnDue: new Date(returnDue),
                reason: reason ?? null,
                items: {
                    create: items.map((it: any) => ({
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

        await tx.equipment.updateMany({
            where: { number: { in: reqRow.items.map((i: any) => i.equipmentId) } },
            data: {
                status: isExternal ? "RESERVED" : "IN_USE",
                currentRequestId: reqRow.id,
                statusChangedAt: new Date(),
            },
        });

        return reqRow;
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// CORS preflight (ถ้าใช้)
export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}

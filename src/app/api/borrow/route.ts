import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
    "PENDING",
    "APPROVED",
    "RETURNED",
    "REJECTED",
    "OVERDUE",
]);
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

/**
 * GET /api/borrow
 * query:
 *  - status: PENDING|APPROVED|RETURNED|REJECTED|OVERDUE (optional)
 *  - page=1&pageSize=20
 */
export async function GET(req: Request) {
    try {
        const sp = new URL(req.url).searchParams;
        const status = sp.get("status")?.toUpperCase() || undefined;
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
                    returnDue: true,
                    actualReturnDate: true,
                    reason: true,
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

        // คำนวณ OVERDUE ให้ด้วย (ถ้าเลือก status=APPROVED เฉยๆ)
        const now = new Date().getTime();
        const data = rows.map((r) => {
            const isOverdue =
                r.status === "APPROVED" &&
                r.returnDue &&
                new Date(r.returnDue).getTime() < now &&
                !r.actualReturnDate;
            return isOverdue ? { ...r, status: "OVERDUE" as const } : r;
        });

        return NextResponse.json(
            { ok: true, page, pageSize, total, data },
            { status: 200 }
        );
    } catch (e) {
        console.error("[GET /api/borrow] error:", e);
        return NextResponse.json(
            { ok: false, error: "server-error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    const me = await auth();
    if (!me)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );

    const body = await req.json();
    const { borrowerType, returnDue, reason, external, items } = body as any;

    if (!items?.length)
        return NextResponse.json({ ok: false, error: "no-items" }, { status: 400 });

    const isInternal = borrowerType === "INTERNAL";
    const isExternal = borrowerType === "EXTERNAL";

    // ตรวจของซ้ำ/ไม่ว่าง
    const eqs = await prisma.equipment.findMany({
        where: { number: { in: items.map((i: { equipmentId: any; }) => i.equipmentId) } },
        select: { number: true, status: true },
    });
    const busy = eqs.filter((e) => e.status === "IN_USE");
    if (busy.length) {
        return NextResponse.json(
            {
                ok: false,
                error: `อุปกรณ์เลข: ${busy
                    .map((b) => b.number)
                    .join(", ")} กำลังถูกยืม`,
            },
            { status: 409 }
        );
    }

    const created = await prisma.$transaction(async (tx) => {
        // For EXTERNAL, support both body.external and top-level externalName/externalDept/externalPhone
        let externalName = null,
            externalDept = null,
            externalPhone = null;
        if (isExternal) {
            externalName = body.externalName ?? external?.name ?? null;
            externalDept = body.externalDept ?? external?.dept ?? null;
            externalPhone = body.externalPhone ?? external?.phone ?? null;
        }
        const reqRow = await tx.borrowRequest.create({
            data: {
                borrowerType,
                requesterId:
                    me.user?.role === "EXTERNAL"
                        ? null
                        : typeof me.user?.id === "number"
                            ? me.user.id
                            : Number(me.user?.id) || null,
                externalName,
                externalDept,
                externalPhone,
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
                approvedById: isInternal
                    ? typeof me.user?.id === "number"
                        ? me.user.id
                        : Number(me.user?.id) || null
                    : null,
                approvedAt: isInternal ? new Date() : null,
            },
            include: { items: true },
        });

        // Update equipment status and currentRequestId for both INTERNAL and EXTERNAL
        await tx.equipment.updateMany({
            where: {
                number: { in: (reqRow as any).items.map((i: any) => i.equipmentId) },
            },
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

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}

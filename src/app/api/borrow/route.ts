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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = pickStatus(searchParams.get("status"));
        const borrowerType = pickBorrower(searchParams.get("borrowerType"));

        const page = Math.max(1, Number(searchParams.get("page") || "1"));
        const pageSize = Math.min(
            100,
            Math.max(1, Number(searchParams.get("pageSize") || "20"))
        );

        // ✅ สร้าง where แบบไม่ยัด null/undefined
        const where = {
            ...(status ? { status } : {}),
            ...(borrowerType ? { borrowerType } : {}),
        };

        // ✅ count แบบตรงๆ ไม่ใช้ select/_count
        const [total, rows] = await prisma.$transaction([
            prisma.borrowRequest.count({ where }),
            prisma.borrowRequest.findMany({
                where,
                include: {
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
                orderBy: [{ createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return NextResponse.json({ ok: true, total, page, pageSize, data: rows });
    } catch (e: any) {
        console.error("[GET /api/borrow] ", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "internal-error" },
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
    const { borrowerType, returnDue, reason, external, items } = body as {
        borrowerType: "INTERNAL" | "EXTERNAL";
        returnDue: string; // YYYY-MM-DD (CE)
        reason?: string;
        external?: { name?: string; dept?: string; phone?: string } | null;
        items: { equipmentId: number; quantity?: number }[];
    };

    if (!items?.length)
        return NextResponse.json({ ok: false, error: "no-items" }, { status: 400 });

    const isInternal = borrowerType === "INTERNAL";
    const isExternal = borrowerType === "EXTERNAL";

    // ตรวจของซ้ำ/ไม่ว่าง
    const eqs = await prisma.equipment.findMany({
        where: { number: { in: items.map((i) => i.equipmentId) } },
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
        const reqRow = await tx.borrowRequest.create({
            data: {
                borrowerType,
                requesterId:
                    me.user?.role === "EXTERNAL"
                        ? null
                        : typeof me.user?.id === "number"
                            ? me.user.id
                            : Number(me.user?.id) || null,
                externalName: external?.name ?? null,
                externalDept: external?.dept ?? null,
                externalPhone: external?.phone ?? null,
                status: isInternal ? "APPROVED" : "PENDING",
                borrowDate: isInternal ? new Date() : null,
                returnDue: new Date(returnDue),
                reason: reason ?? null,
                items: {
                    create: items.map((it) => ({
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

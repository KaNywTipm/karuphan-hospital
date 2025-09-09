import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as
        | "PENDING"
        | "APPROVED"
        | "RETURNED"
        | "REJECTED"
        | "OVERDUE"
        | undefined;
    const borrowerType = searchParams.get("borrowerType") as
        | "INTERNAL"
        | "EXTERNAL"
        | undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(
        100,
        Math.max(1, Number(searchParams.get("pageSize") || "20"))
    );

    const where = { status, borrowerType };

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

    const autoApprove = borrowerType === "INTERNAL";

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
                status: autoApprove ? "APPROVED" : "PENDING",
                borrowDate: autoApprove ? new Date() : null,
                returnDue: new Date(returnDue),
                reason: reason ?? null,
                items: {
                    create: items.map((it) => ({
                        equipmentId: it.equipmentId,
                        quantity: it.quantity ?? 1,
                    })),
                },
                approvedById: autoApprove
                    ? typeof me.user?.id === "number"
                        ? me.user.id
                        : Number(me.user?.id) || null
                    : null,
                approvedAt: autoApprove ? new Date() : null,
            },
            include: { items: true },
        });

        if (autoApprove && Array.isArray((reqRow as any).items)) {
            await tx.equipment.updateMany({
                where: {
                    number: { in: (reqRow as any).items.map((i: any) => i.equipmentId) },
                },
                data: {
                    status: "IN_USE",
                    currentRequestId: reqRow.id,
                    statusChangedAt: new Date(),
                    // statusNote: `Borrowed by ${me.user?.fullName ?? ""}`,
                },
            });
        }

        return reqRow;
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}

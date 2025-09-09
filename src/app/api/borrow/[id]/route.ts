import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const me = await auth();
    if (!me || !me.user)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );

    try {
        const body = await req.json();
        const { borrowerType, returnDue, reason, external, items } = body as {
            borrowerType: "INTERNAL" | "EXTERNAL";
            returnDue: string;
            reason?: string;
            external?: { name?: string; dept?: string; phone?: string } | null;
            items: { equipmentId: number; quantity?: number }[];
        };

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { ok: false, error: "no-items" },
                { status: 400 }
            );
        }

        // ตรวจว่ามีชิ้นไหนไม่ว่างอยู่แล้ว
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

        const isInternal = borrowerType === "INTERNAL";
        const isExternal = borrowerType === "EXTERNAL";

        const created = await prisma.$transaction(async (tx) => {
            const request = await tx.borrowRequest.create({
                data: {
                    borrowerType,
                    requesterId: me.user.role === "EXTERNAL" ? null : Number(me.user.id),
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
                    approvedById: isInternal ? Number(me.user.id) : null,
                    approvedAt: isInternal ? new Date() : null,
                },
                include: { items: true },
            });

            const ids = items.map((i: any) => i.equipmentId);
            await tx.equipment.updateMany({
                where: { number: { in: ids } },
                data: {
                    status: isExternal ? "RESERVED" : "IN_USE",
                    currentRequestId: request.id,
                    statusChangedAt: new Date(),
                },
            });

            return request;
        });

        return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
    } catch (e: any) {
        console.error("[POST /api/borrow] ", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "internal-error" },
            { status: 500 }
        );
    }
}

const asStatus = (v: string | null) =>
    v && ["PENDING", "APPROVED", "RETURNED", "REJECTED", "OVERDUE"].includes(v)
        ? (v as any)
        : undefined;
const asBorrower = (v: string | null) =>
    v && ["INTERNAL", "EXTERNAL"].includes(v) ? (v as any) : undefined;

type Params = { params: { id: string } };

// GET by id
export async function GET(_req: Request, { params }: Params) {
    const id = Number(params.id);
    const row = await prisma.borrowRequest.findUnique({
        where: { id },
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
                    equipment: {
                        select: { number: true, code: true, name: true, status: true },
                    },
                },
            },
        },
    });
    if (!row)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );
    return NextResponse.json({ ok: true, data: row });
}

// GET collection (for /api/borrow)
export async function GET_COLLECTION(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const status = asStatus(searchParams.get("status"));
        const borrowerType = asBorrower(searchParams.get("borrowerType"));

        const where: any = {};
        if (status) where.status = status;
        if (borrowerType) where.borrowerType = borrowerType;

        const page = Math.max(1, Number(searchParams.get("page") || "1"));
        const pageSize = Math.min(
            100,
            Math.max(1, Number(searchParams.get("pageSize") || "20"))
        );

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

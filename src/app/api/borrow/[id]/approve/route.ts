import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function approveCore(id: number) {
    const reqRow = await prisma.borrowRequest.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!reqRow) return { status: 404, body: { ok: false, error: "not-found" } };
    if (reqRow.status !== "PENDING")
        return { status: 400, body: { ok: false, error: "only-pending" } };

    // กันชน: มีอุปกรณ์ไหนไม่ว่างระหว่างรอไหม
    const conflicts = await prisma.equipment.findMany({
        where: {
            number: { in: reqRow.items.map((i) => i.equipmentId) },
            status: { not: "NORMAL" },
        },
        select: { number: true },
    });
    if (conflicts.length) {
        return {
            status: 409,
            body: {
                ok: false,
                error: "equipment-busy",
                detail: { numbers: conflicts.map((c) => c.number) },
            },
        };
    }

    const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.borrowRequest.update({
            where: { id },
            data: { status: "APPROVED", approvedAt: new Date() },
            include: { items: true },
        });
        await Promise.all(
            u.items.map((it) =>
                tx.equipment.update({
                    where: { number: Number(it.equipmentId) },
                    data: { status: "IN_USE" },
                })
            )
        );
        return u;
    });
    return { status: 200, body: { ok: true, data: updated } };
}

export async function PATCH(
    _: Request,
    { params }: { params: { id: string } }
) {
    const session: any = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    const { status, body } = await approveCore(id);
    return NextResponse.json(body as any, { status });
}
export async function POST(req: Request, ctx: any) {
    return PATCH(req, ctx);
}

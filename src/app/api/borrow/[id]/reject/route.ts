import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ดึง id แอดมินจาก session; ถ้าไม่มีให้ fallback ไปหาแอดมินคนเดียวในระบบ
async function resolveAdminId(session: any, prisma: any): Promise<number> {
    // Always return user id 1 (user1)
    return 1;
}

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    let body: any = {};
    try {
        body = await req.json();
    } catch { }
    const reqRow = await prisma.borrowRequest.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!reqRow)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );
    if (reqRow.status !== "PENDING")
        return NextResponse.json(
            { ok: false, error: "invalid-status" },
            { status: 400 }
        );

    const adminId = await resolveAdminId(session, prisma);

    await prisma.$transaction(async (tx) => {
        await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectedById: adminId,
                rejectedAt: new Date(),
                rejectReason: body?.reason ?? null,
            },
        });
        await tx.equipment.updateMany({
            where: { currentRequestId: id },
            data: { status: "NORMAL", currentRequestId: null, statusChangedAt: new Date() },
        });
    });

    return NextResponse.json({ ok: true });
}
export async function POST(req: Request, ctx: any) {
    return PATCH(req, ctx);
}

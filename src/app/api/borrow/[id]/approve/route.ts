import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
    const admin = await auth();
    if (!admin || admin.user.role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
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

    // ตรวจของไม่ว่าง
    const eqs = await prisma.equipment.findMany({
        where: { number: { in: reqRow.items.map((i) => i.equipmentId) } },
        select: { number: true, status: true, currentRequestId: true },
    });
    const busy = eqs.filter((e) => e.status === "IN_USE");
    if (busy.length)
        return NextResponse.json(
            {
                ok: false,
                error: `อุปกรณ์เลข: ${busy
                    .map((b) => b.number)
                    .join(", ")} กำลังถูกยืม`,
            },
            { status: 409 }
        );

    await prisma.$transaction(async (tx) => {
        await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "APPROVED",
                approvedById: Number(admin.user.id),
                approvedAt: new Date(),
                borrowDate: new Date(),
            },
        });
        await tx.equipment.updateMany({
            where: { currentRequestId: id },
            data: {
                status: "IN_USE",
                statusChangedAt: new Date(),
            },
        });
    });

    return NextResponse.json({ ok: true });
}

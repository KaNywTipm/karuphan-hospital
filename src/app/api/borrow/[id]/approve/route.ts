import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
    _: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const meId = Number((session.user as any).id);
    const role = String((session.user as any).role || "");
    if (role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    if (!Number.isFinite(id))
        return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });

    const req = await prisma.borrowRequest.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!req)
        return NextResponse.json(
            { ok: false, error: "not_found" },
            { status: 404 }
        );
    if (req.status !== "PENDING")
        return NextResponse.json(
            { ok: false, error: "invalid_status" },
            { status: 400 }
        );

    await prisma.$transaction(async (tx) => {
        // เปลี่ยนสถานะครุภัณฑ์เป็น IN_USE
        for (const it of req.items) {
            await tx.equipment.update({
                where: { number: it.equipmentId },
                data: { status: "IN_USE" },
            });
        }

        await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "APPROVED",
                borrowDate: new Date(),
                approvedById: meId,
                approvedAt: new Date(),
                rejectReason: null,
            },
        });
    });

    return NextResponse.json({ ok: true });
}

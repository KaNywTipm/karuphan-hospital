import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";
import { ApproveSchema } from "@/lib/validators/borrow";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    const body = ApproveSchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success)
        return NextResponse.json(
            { ok: false, error: body.error.flatten() },
            { status: 400 }
        );

    const adminId = Number((ses as any).user?.id);

    const updated = await prisma.$transaction(async (tx) => {
        const br = await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "APPROVED",
                approvedAt: new Date(),
                approvedById: adminId,
                borrowDate: body.data.borrowDate ?? new Date(),
            },
            include: { items: true },
        });

        // อัปเดตสถานะครุภัณฑ์ทุกชิ้นในคำขอเป็น IN_USE
        await tx.equipment.updateMany({
            where: { number: { in: br.items.map((i) => i.equipmentId) } },
            data: { status: "IN_USE" },
        });

        return br;
    });

    return NextResponse.json({ ok: true, data: { id: updated.id } });
}

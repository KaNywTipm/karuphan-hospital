import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";
import { ReturnSchema } from "@/lib/validators/borrow";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    const body = ReturnSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ ok: false, error: body.error.flatten() }, { status: 400 });

    const adminId = Number((ses as any).user?.id);
    const condition = body.data.condition;

    const updated = await prisma.$transaction(async (tx) => {
        const br = await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "RETURNED",
                actualReturnDate: body.data.actualReturnDate ?? new Date(),
                returnCondition: condition,
                returnNotes: body.data.notes ?? null,
                receivedById: adminId,
            },
            include: { items: true },
        });

        // map สภาพคืน -> สถานะครุภัณฑ์
        const map: Record<string, "NORMAL" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED"> = {
            NORMAL: "NORMAL",
            BROKEN: "BROKEN",
            LOST: "LOST",
            WAIT_DISPOSE: "WAIT_DISPOSE",
            DISPOSED: "DISPOSED",
        };

        await tx.equipment.updateMany({
            where: { number: { in: br.items.map(i => i.equipmentId) } },
            data: { status: map[condition] },
        });

        return br;
    });

    return NextResponse.json({ ok: true, data: { id: updated.id } });
}

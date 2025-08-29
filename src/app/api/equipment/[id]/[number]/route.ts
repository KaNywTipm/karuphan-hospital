import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { EquipmentUpdateSchema } from "@/lib/validators/asset";
import { badRequest } from "@/lib/api-helpers";

export async function PATCH(
    req: Request,
    { params }: { params: { number: string } }
) {
    try {
        const number = Number(params.number);
        const dto = EquipmentUpdateSchema.parse(await req.json());
        const data = await prisma.equipment.update({
            where: { number },
            data: dto,
        });
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return badRequest(e);
    }
}

export async function DELETE(
    _: Request,
    { params }: { params: { number: string } }
) {
    try {
        const number = Number(params.number);
        await prisma.equipment.delete({ where: { number } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return badRequest(e);
    }
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CategoryUpdateSchema } from "@/lib/validators/asset";
import { badRequest } from "@/lib/api-helpers";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id);
        const dto = CategoryUpdateSchema.parse(await req.json());
        const data = await prisma.category.update({ where: { id }, data: dto });
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return badRequest(e);
    }
}

// แนะนำ "ปิดการใช้งาน" มากกว่าลบจริง เพื่อไม่กระทบอุปกรณ์
export async function DELETE(
    _: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id);
        const data = await prisma.category.update({
            where: { id },
            data: { isActive: false },
        });
        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return badRequest(e);
    }
}

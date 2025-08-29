import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { EquipmentCreateSchema } from "@/lib/validators/asset";
import { badRequest } from "@/lib/api-helpers";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const categoryId = searchParams.get("categoryId");

    const items = await prisma.equipment.findMany({
        where: {
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { code: { contains: q, mode: "insensitive" } },
                        { idnum: { contains: q, mode: "insensitive" } },
                    ],
                }
                : {}),
            ...(status ? { status: status as any } : {}),
            ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        },
        orderBy: [{ createdAt: "desc" }],
        include: { category: true },
    });
    return NextResponse.json({ ok: true, data: items });
}

export async function POST(req: Request) {
    try {
        const dto = EquipmentCreateSchema.parse(await req.json());
        const data = await prisma.equipment.create({ data: dto });
        return NextResponse.json({ ok: true, data }, { status: 201 });
    } catch (e: any) {
        if (e.code === "P2002")
            return NextResponse.json(
                { ok: false, error: "รหัส/หมายเลขซ้ำ" },
                { status: 409 }
            );
        return badRequest(e);
    }
}

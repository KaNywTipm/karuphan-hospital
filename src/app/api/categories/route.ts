import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CategoryCreateSchema } from "@/lib/validators/asset";
import { badRequest } from "@/lib/api-helpers";

export async function GET() {
    const items = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ ok: true, data: items });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const dto = CategoryCreateSchema.parse(body);
        const data = await prisma.category.create({ data: { ...dto, isActive: true } });
        return NextResponse.json({ ok: true, data }, { status: 201 });
    } catch (e) { return badRequest(e); }
}

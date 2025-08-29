import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CategoryCreateSchema } from "@/lib/validators/category";

export async function GET() {
    const categories = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(categories);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = CategoryCreateSchema.parse(body);
        const created = await prisma.category.create({
            data: {
                name: parsed.name.trim(),
                description: parsed.description ?? null,
            },
        });
        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        const msg =
            e?.code === "P2002"
                ? "มีชื่อหมวดหมู่ซ้ำในระบบ"
                : e?.message || "เกิดข้อผิดพลาด";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

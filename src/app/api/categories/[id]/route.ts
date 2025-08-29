import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CategoryUpdateSchema } from "@/lib/validators/category";

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const id = Number(params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category)
        return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    return NextResponse.json(category);
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id);
        const body = await req.json();
        const parsed = CategoryUpdateSchema.parse(body);

        const updated = await prisma.category.update({
            where: { id },
            data: {
                ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
                ...(parsed.description !== undefined
                    ? { description: parsed.description }
                    : {}),
            },
        });
        return NextResponse.json(updated);
    } catch (e: any) {
        const msg =
            e?.code === "P2025"
                ? "ไม่พบรายการ"
                : e?.code === "P2002"
                    ? "มีชื่อหมวดหมู่ซ้ำในระบบ"
                    : e?.message || "เกิดข้อผิดพลาด";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = Number(params.id);
        await prisma.category.update({
            where: { id },
            data: { isActive: false }, // soft delete เพื่อความปลอดภัย
        });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        const msg = e?.code === "P2025" ? "ไม่พบรายการ" : "ลบไม่ได้";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CategoryCreateSchema } from "@/lib/validators/category";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") || "";
        const activeOnly = url.searchParams.get("activeOnly");

        const rows = await prisma.category.findMany({
            where: {
                ...(activeOnly ? { isActive: true } : {}),
                name: { contains: q, mode: "insensitive" },
            },
            select: { id: true, name: true, description: true, isActive: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(
            { ok: true, data: rows },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (e: any) {
        console.error("GET /api/categories error:", e);
        return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
    }
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

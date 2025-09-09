import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { EquipmentCreateSchema } from "@/lib/validators/equipment";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = Number(searchParams.get("categoryId")) || undefined;
    const status = searchParams.get("status") as
        | "NORMAL"
        | "IN_USE"
        | "BROKEN"
        | "LOST"
        | "WAIT_DISPOSE"
        | "DISPOSED"
        | undefined;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(
        100,
        Math.max(1, Number(searchParams.get("pageSize") || "20"))
    );

    const where: Prisma.EquipmentWhereInput = {
        categoryId,
        status,
        OR: q
            ? [
                { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
                { code: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
                { idnum: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
            ]
            : undefined,
    };

    const [total, rows] = await prisma.$transaction([
        prisma.equipment.count({ where }),
        prisma.equipment.findMany({
            where,
            select: {
                number: true,
                code: true,
                idnum: true,
                name: true,
                status: true,
                currentRequestId: true,
                category: { select: { id: true, name: true } },
            },
            orderBy: [{ status: "asc" }, { name: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    // enrich
    const data = rows.map((e) => ({
        ...e,
        isBusy: e.status === "IN_USE",
        canBorrow: e.status === "NORMAL",
    }));

    return NextResponse.json({ ok: true, page, pageSize, total, data });
}

// POST /api/equipment
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = EquipmentCreateSchema.parse(body);

        // ตรวจ category มีจริงไหม
        const cat = await prisma.category.findUnique({
            where: { id: parsed.categoryId },
        });
        if (!cat)
            return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 400 });

        const created = await prisma.equipment.create({
            data: {
                code: parsed.code.trim(),
                idnum: parsed.idnum?.trim() || null,
                name: parsed.name.trim(),
                // description: parsed.description || null,
                price: parsed.price ?? null,
                receivedDate: new Date(parsed.receivedDate), // ค.ศ.
                status: parsed.status || "NORMAL",
                categoryId: parsed.categoryId,
            },
            include: { category: true },
        });

        return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch (e: any) {
        const msg =
            e?.code === "P2002"
                ? "เลขครุภัณฑ์/รหัสซ้ำในระบบ"
                : e?.message || "เกิดข้อผิดพลาด";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

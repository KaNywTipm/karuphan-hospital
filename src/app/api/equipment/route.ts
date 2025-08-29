import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EquipmentCreateSchema } from "@/lib/validators/equipment";

// helper: แปลง Date → "YYYY-MM-DD"
const toYmd = (d: Date) => d.toISOString().slice(0, 10);

// GET /api/equipment?search=&page=1&pageSize=20&sort=receivedDate:desc&status=&categoryId=
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("search")?.trim() || "";
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(
        Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1),
        100
    );
    const sort = (searchParams.get("sort") || "receivedDate:desc").split(":");
    const status = searchParams.get("status") || undefined;
    const categoryId = searchParams.get("categoryId");

    const orderBy = {
        [sort[0] || "receivedDate"]: (sort[1] === "asc" ? "asc" : "desc") as
            | "asc"
            | "desc",
    };

    const where: any = {};
    if (q) {
        where.OR = [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
        ];
    }
    if (status) where.status = status;
    if (categoryId) where.categoryId = Number(categoryId);

    const [total, rows] = await Promise.all([
        prisma.equipment.count({ where }),
        prisma.equipment.findMany({
            where,
            include: { category: true },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    // จัดรูปให้ UI ใช้ง่าย (ส่งวันที่เป็น "YYYY-MM-DD")
    const data = rows.map((r) => ({
        number: r.number,
        code: r.code,
        idnum: r.idnum,
        name: r.name,
        description: r.description,
        price: r.price,
        receivedDate: toYmd(r.receivedDate),
        status: r.status,
        category: { id: r.categoryId, name: r.category.name },
    }));

    return NextResponse.json({ data, page, pageSize, total });
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
                description: parsed.description || null,
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
    "NORMAL",
    "IN_USE",
    "BROKEN",
    "LOST",
    "WAIT_DISPOSE",
    "DISPOSED",
]);

function pickStatus(v: string | null | undefined) {
    if (!v) return undefined;
    const s = v.toUpperCase();
    return ALLOWED_STATUS.has(s) ? (s as any) : undefined;
}

function buildOrderBy(sortParam: string | null): any[] {
    // รองรับ ?sort=receivedDate:desc | name:asc | status:asc | code:asc
    const allowed = new Set(["status", "name", "receivedDate", "code"]);
    if (!sortParam) return [{ status: "asc" as const }, { name: "asc" as const }];
    const [fieldRaw, dirRaw] = String(sortParam).split(":");
    const field = fieldRaw?.trim();
    const dir = (dirRaw?.toLowerCase() === "desc" ? "desc" : "asc") as
        | "asc"
        | "desc";
    if (!field || !allowed.has(field))
        return [{ status: "asc" as const }, { name: "asc" as const }];
    return [{ [field]: dir } as any];
}

/** ---------- GET /api/equipment (ลิสต์) ---------- */
export async function GET(req: Request) {
    try {
        const sp = new URL(req.url).searchParams;

        const q = sp.get("q")?.trim() || undefined;
        const categoryId = sp.get("categoryId");
        const categoryIdNum = categoryId ? Number(categoryId) : undefined;

        const status = pickStatus(sp.get("status")); // ถ้าค่าว่าง/ผิด จะเมิน
        const page = Math.max(1, Number(sp.get("page") || "1"));
        const rawSize = Math.max(1, Number(sp.get("pageSize") || "20"));
        const pageSize = Math.min(500, rawSize);
        const orderBy = buildOrderBy(sp.get("sort"));

        const where: any = {
            ...(categoryIdNum ? { categoryId: categoryIdNum } : {}),
            ...(status ? { status } : {}),
        };
        if (q) {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { idnum: { contains: q, mode: "insensitive" } },
            ];
        }

        const [total, rows] = await prisma.$transaction([
            prisma.equipment.count({ where }),
            prisma.equipment.findMany({
                where,
                select: {
                    number: true,
                    code: true,
                    idnum: true,
                    name: true,
                    description: true,
                    status: true,
                    receivedDate: true,
                    price: true,
                    currentRequestId: true,
                    category: { select: { id: true, name: true } },
                },
                orderBy,
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return NextResponse.json({ ok: true, page, pageSize, total, data: rows });
    } catch (e: any) {
        console.error("[GET /api/equipment] ", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "internal-error" },
            { status: 500 }
        );
    }
}

/** ---------- POST /api/equipment (สร้าง) ---------- */
export async function POST(req: Request) {
    const session: any = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: "invalid-json" },
            { status: 400 }
        );
    }

    const {
        code,
        name,
        description,
        categoryId,
        receivedDate, // "YYYY-MM-DD" หรือ ISO
        price, // string/number ก็ได้ (Decimal)
        idnum, // optional
        status, // optional -> default NORMAL
        statusNote, // optional
    } = body ?? {};

    if (!code || !name || !categoryId || !receivedDate) {
        return NextResponse.json(
            {
                ok: false,
                error: "missing-fields",
                require: ["code", "name", "categoryId", "receivedDate"],
            },
            { status: 400 }
        );
    }

    const statusFinal = String(status ?? "NORMAL").toUpperCase();
    if (!ALLOWED_STATUS.has(statusFinal)) {
        return NextResponse.json(
            { ok: false, error: "invalid-status" },
            { status: 400 }
        );
    }
    if (statusFinal === "IN_USE") {
        // กันการสร้างเป็น IN_USE ด้วยมือ (ให้เกิดจาก borrow เท่านั้น)
        return NextResponse.json(
            { ok: false, error: "cannot-set-in-use-manually" },
            { status: 409 }
        );
    }

    const data: any = {
        code: String(code).trim(),
        name: String(name).trim(),
        categoryId: Number(categoryId),
        receivedDate: new Date(receivedDate),
        status: statusFinal as any,
    };
    if (idnum != null && String(idnum).trim() !== "")
        data.idnum = String(idnum).trim();
    if (price != null && String(price).trim() !== "") data.price = String(price); // Prisma Decimal รองรับ string
    if (statusNote != null) data.statusNote = String(statusNote);

    try {
        const created = await prisma.equipment.create({
            data,
            select: {
                number: true,
                code: true,
                idnum: true,
                description: true,
                name: true,
                status: true,
                receivedDate: true,
                price: true,
                category: { select: { id: true, name: true } },
            },
        });
        return NextResponse.json({ ok: true, data: created }, { status: 201 });
    } catch (e: any) {
        if (e?.code === "P2002") {
            // unique: code (หรือ unique [categoryId,idnum])
            return NextResponse.json(
                { ok: false, error: "duplicate-unique" },
                { status: 409 }
            );
        }
        if (e?.code === "P2003") {
            // FK: categoryId ไม่ถูกต้อง
            return NextResponse.json(
                { ok: false, error: "invalid-category" },
                { status: 400 }
            );
        }
        console.error("[POST /api/equipment]", e);
        return NextResponse.json(
            { ok: false, error: "server-error" },
            { status: 500 }
        );
    }
}

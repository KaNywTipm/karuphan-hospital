import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
    // ต้องเป็น ADMIN เท่านั้น
    const guard = await requireRole(["ADMIN"]);
    if (guard) return guard; // คืน 401/403 ตามที่ requireRole ตรวจ

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const where = q
        ? {
            OR: [
                { fullName: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
                { phone: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
        }
        : {};

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            department: { select: { id: true, name: true } },
            createdAt: true,
        },
    });

    return NextResponse.json({ ok: true, items: users });
}

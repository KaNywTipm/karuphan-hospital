import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET() {
    const rows = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            department: { select: { id: true, name: true } },
        },
    });
    return NextResponse.json({ ok: true, items: rows });
}

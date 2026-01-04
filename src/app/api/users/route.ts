import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/users?q=&role=&includeInactive=
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const role = (url.searchParams.get("role") ?? "").trim().toUpperCase();
    const includeInactive = ["1", "true", "all"].includes(
      (url.searchParams.get("includeInactive") ?? "").toLowerCase()
    );

    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (role === "ADMIN" || role === "INTERNAL" || role === "EXTERNAL") {
      where.role = role;
    }
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { department: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        department: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ ok: true, items: rows });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "server-error" },
      { status: 500 }
    );
  }
}

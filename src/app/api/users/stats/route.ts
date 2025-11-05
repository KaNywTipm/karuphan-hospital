import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "ADMIN") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // นับเฉพาะผู้ใช้ที่ active
    const grouped = await prisma.user.groupBy({
        by: ["role"],
        where: { isActive: true },
        _count: { role: true },
    });

    const internal =
        grouped.find((g) => g.role === "INTERNAL")?._count.role ?? 0;
    const external =
        grouped.find((g) => g.role === "EXTERNAL")?._count.role ?? 0;

    return NextResponse.json({
        ok: true,
        data: { internal, external },
    });
}

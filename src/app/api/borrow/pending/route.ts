import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const session: any = await auth();
    const role = String(session?.role ?? session?.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const rows = await prisma.borrowRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
            requester: { select: { fullName: true, email: true } },
            items: { include: { equipment: { select: { number: true, name: true } } } },
        },
    });
    return NextResponse.json({ ok: true, data: rows });
}

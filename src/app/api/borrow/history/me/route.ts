import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const email = session.user?.email ?? null;
    if (!email) return NextResponse.json({ ok: false, error: "no-email-in-session" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 401 });

    const rows = await prisma.borrowRequest.findMany({
        where: { requesterId: user.id },
        orderBy: { createdAt: "desc" },
        include: { items: { include: { equipment: { select: { number: true, name: true } } } } },
    });
    return NextResponse.json({ ok: true, data: rows });
}

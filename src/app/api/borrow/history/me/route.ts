import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | undefined;

    if (!userId) return NextResponse.json({ ok: false, error: "missing-userId" }, { status: 400 });

    const rows = await prisma.borrowRequest.findMany({
        where: { requesterId: userId, status },
        orderBy: [{ createdAt: "desc" }],
        include: {
            items: { include: { equipment: { select: { number: true, code: true, name: true } } } },
            receivedBy: { select: { fullName: true } },
        },
    });

    return NextResponse.json({ ok: true, data: rows });
}

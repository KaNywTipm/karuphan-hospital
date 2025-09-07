import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { userId: string } }) {
    // อนุญาตเฉพาะ ADMIN ดูของใครก็ได้
    const session: any = await auth();
    const role = String(session?.role ?? session?.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const userId = Number(params.userId);
    if (!Number.isFinite(userId)) {
        return NextResponse.json({ ok: false, error: "invalid-userId" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || 10)));
    const status = searchParams.get("status") as
        | "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "RETURNED" | null;
    const from = searchParams.get("from"); // YYYY-MM-DD หรือ ISO
    const to = searchParams.get("to");

    const where: any = { requesterId: userId };
    if (status) where.status = status;
    if (from || to) where.requestedAt = {};
    if (from) where.requestedAt.gte = new Date(from);
    if (to) where.requestedAt.lte = new Date(to);

    const [rows, total] = await Promise.all([
        prisma.borrowRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                items: {
                    include: {
                        equipment: { select: { number: true, name: true } }, // ใช้ number ตามสคีมาของคุณ
                    },
                },
            },
        }),
        prisma.borrowRequest.count({ where }),
    ]);

    return NextResponse.json({
        ok: true,
        data: {
            rows,
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    });
}

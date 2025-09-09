import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
    const admin = await auth();
    if (!admin || admin.user.role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    const { rejectReason } = await req.json();

    const row = await prisma.borrowRequest.findUnique({ where: { id } });
    if (!row)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );
    if (row.status !== "PENDING")
        return NextResponse.json(
            { ok: false, error: "invalid-status" },
            { status: 400 }
        );

    await prisma.borrowRequest.update({
        where: { id },
        data: {
            status: "REJECTED",
            rejectedById: Number(admin.user.id),
            rejectedAt: new Date(),
            rejectReason: rejectReason ?? null,
        },
    });

    return NextResponse.json({ ok: true });
}
export async function POST(req: Request, ctx: any) {
    return PATCH(req, ctx);
}

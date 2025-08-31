import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const meId = Number((session.user as any).id);
    const role = String((session.user as any).role || "");
    if (role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    if (!Number.isFinite(id))
        return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const rejectReason = String(body?.rejectReason ?? "").trim();
    if (!rejectReason)
        return NextResponse.json(
            { ok: false, error: "reject_reason_required" },
            { status: 400 }
        );

    const br = await prisma.borrowRequest.findUnique({ where: { id } });
    if (!br)
        return NextResponse.json(
            { ok: false, error: "not_found" },
            { status: 404 }
        );
    if (br.status !== "PENDING")
        return NextResponse.json(
            { ok: false, error: "invalid_status" },
            { status: 400 }
        );

    await prisma.borrowRequest.update({
        where: { id },
        data: {
            status: "REJECTED",
            approvedById: meId, // ผู้ตัดสินใจ
            approvedAt: new Date(),
            rejectReason,
        },
    });

    return NextResponse.json({ ok: true });
}

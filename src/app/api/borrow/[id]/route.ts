import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session: any = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    const r = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
            requester: {
                select: { fullName: true, department: { select: { name: true } } },
            },
            items: {
                include: { equipment: { select: { number: true, name: true } } },
            },
        },
    });
    if (!r)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );

    return NextResponse.json({
        ok: true,
        data: {
            id: r.id,
            borrowerName: r.requester?.fullName ?? null,
            department: r.requester?.department?.name ?? null,
            reason: (r as any).reason ?? (r as any).notes ?? null,
            borrowDate:
                (
                    (r as any).createdAt ??
                    (r as any).requestDate ??
                    null
                )?.toISOString?.() ?? null,
            returnDue: (r as any).returnDue?.toISOString?.() ?? null,
            actualReturnDate: (r as any).actualReturnDate?.toISOString?.() ?? null,
            items: r.items.map((it) => ({
                number: it.equipment?.number ?? it.equipmentId,
                name: it.equipment?.name ?? "-",
                quantity: (it as any).quantity ?? 1,
            })),
        },
    });
}

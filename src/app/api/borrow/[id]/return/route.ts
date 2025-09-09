import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ReturnCondition } from "@/types/prisma-enums";

export const dynamic = "force-dynamic";
type Params = { params: { id: string } };

const mapStatus: Record<ReturnCondition, ReturnCondition> = {
    NORMAL: "NORMAL",
    BROKEN: "BROKEN",
    LOST: "LOST",
    WAIT_DISPOSE: "WAIT_DISPOSE",
    DISPOSED: "DISPOSED",
};

export async function PATCH(req: Request, { params }: Params) {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );
    }

    const id = Number(params.id);
    const body = await req.json();
    const actualReturnDate = new Date(body.actualReturnDate);
    const returnCondition = String(
        body.returnCondition || "NORMAL"
    ).toUpperCase() as ReturnCondition;

    const row = await prisma.borrowRequest.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!row)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );
    if (row.status !== "APPROVED")
        return NextResponse.json(
            { ok: false, error: "invalid-status" },
            { status: 400 }
        );

    await prisma.$transaction(async (tx) => {
        await tx.borrowRequest.update({
            where: { id },
            data: {
                status: "RETURNED",
                actualReturnDate,
                returnCondition,
                returnNotes: body.returnNotes ?? null,
                receivedById: Number(session.user.id),
            },
        });
        await tx.equipment.updateMany({
            where: { number: { in: row.items.map((i) => i.equipmentId) } },
            data: {
                status: mapStatus[returnCondition] ?? "NORMAL",
                currentRequestId: null,
                statusChangedAt: new Date(),
                statusNote: `Returned (${returnCondition})`,
            },
        });
    });

    return NextResponse.json({ ok: true });
}

// Keep POST and utility functions from the original code if needed

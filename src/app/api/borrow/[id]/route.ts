import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String((session.user as any).role || "");
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
    }

    const row = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
            requester: { select: { fullName: true, department: { select: { name: true } } } },
            approvedBy: { select: { fullName: true } },
            receivedBy: { select: { fullName: true } },
            items: { include: { equipment: { select: { number: true, code: true, name: true } } } },
        },
    });

    if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    return NextResponse.json({
        ok: true,
        data: {
            id: row.id,
            status: row.status,
            borrowerType: row.borrowerType,
            borrowerName: row.borrowerType === "INTERNAL" ? (row.requester?.fullName ?? "-") : (row.externalName ?? "-"),
            department: row.borrowerType === "INTERNAL" ? (row.requester?.department?.name ?? "-") : (row.externalDept ?? "-"),
            reason: row.reason ?? null,
            borrowDate: row.borrowDate?.toISOString() ?? null,
            returnDue: row.returnDue?.toISOString() ?? null,
            actualReturnDate: row.actualReturnDate?.toISOString() ?? null,
            approvedBy: row.approvedBy?.fullName ?? null,
            receivedBy: row.receivedBy?.fullName ?? null,
            returnCondition: row.returnCondition ?? null,
            returnNotes: row.returnNotes ?? null,
            items: row.items.map((it) => ({
                equipmentId: it.equipmentId,
                number: it.equipment.number,
                code: it.equipment.code,
                name: it.equipment.name,
                quantity: it.quantity,
            })),
        },
    });
}

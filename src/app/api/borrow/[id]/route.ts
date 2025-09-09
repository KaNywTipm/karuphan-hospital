import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
    const id = Number(params.id);
    const row = await prisma.borrowRequest.findUnique({
        where: { id },
        include: {
            requester: {
                select: {
                    id: true,
                    fullName: true,
                    department: { select: { name: true } },
                },
            },
            approvedBy: { select: { id: true, fullName: true } },
            receivedBy: { select: { id: true, fullName: true } },
            items: {
                include: {
                    equipment: {
                        select: { number: true, code: true, name: true, status: true },
                    },
                },
            },
        },
    });
    if (!row)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );
    return NextResponse.json({ ok: true, data: row });
}

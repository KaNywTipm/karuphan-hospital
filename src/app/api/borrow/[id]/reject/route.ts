import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";
import { RejectSchema } from "@/lib/validators/borrow";

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    const body = RejectSchema.safeParse(await req.json());
    if (!body.success)
        return NextResponse.json(
            { ok: false, error: body.error.flatten() },
            { status: 400 }
        );

    const br = await prisma.borrowRequest.update({
        where: { id },
        data: { status: "REJECTED", rejectReason: body.data.rejectReason },
        select: { id: true },
    });

    return NextResponse.json({ ok: true, data: br });
}

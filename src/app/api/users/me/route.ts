import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
    fullName: z.string().min(1, "กรอกชื่อ-สกุล"),
    phone: z.string().min(3, "กรอกเบอร์โทร").max(50),
    departmentId: z.number().int().positive().nullable().optional(), // ภายนอกให้เป็น null ได้
});

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({
        where: { id: Number((session.user as any).id) },
        select: {
            id: true, email: true, fullName: true, phone: true, role: true, isActive: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ ok: true, user: me });
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { fullName, phone, departmentId } = parsed.data;

    const updated = await prisma.user.update({
        where: { id: Number((session.user as any).id) },
        data: { fullName, phone, departmentId: departmentId ?? null },
        select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            departmentId: true,
            department: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ ok: true, user: updated });
}

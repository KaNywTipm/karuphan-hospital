import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, Role } from "@/lib/require-role";
import { auth } from "@/lib/auth";

const UpdateUserSchema = z.object({
    fullName: z.string().min(1),
    phone: z.string().trim().optional().nullable(),
    role: z.enum(["ADMIN", "INTERNAL", "EXTERNAL"]),
    departmentId: z.number().int().positive().nullable().optional(),
    changeNote: z.string().optional(),
});

// PATCH /api/users/:id  (ADMIN เท่านั้น)
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
    const guard = await requireRole(["ADMIN"]);
    if (guard) return guard;

    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    const parsed = UpdateUserSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const body = parsed.data;

    // INTERNAL เท่านั้นที่มี departmentId; role อื่น -> เคลียร์
    const departmentId = body.role === "INTERNAL" ? (body.departmentId ?? null) : null;

    const user = await prisma.user.update({
        where: { id },
        data: {
            fullName: body.fullName,
            phone: body.phone ?? null,
            role: body.role as Role,
            departmentId,
        },
        select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            role: true,
            department: { select: { id: true, name: true } },
        },
    }).catch(() => null);

    if (!user) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // (ออปชัน) เขียน AuditLog
    try {
        const me = await auth();
        await prisma.auditLog.create({
            data: {
                userId: Number((me?.user as any)?.id) || null,
                action: "UPDATE",
                tableName: "User",
                recordId: id,
                newValue: user,
            },
        });
    } catch { }

    return NextResponse.json({ ok: true, item: user });
}

// DELETE /api/users/:id  (ADMIN เท่านั้น)
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
    const guard = await requireRole(["ADMIN"]);
    if (guard) return guard;

    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
    }

    const me = await auth();
    const myId = Number((me?.user as any)?.id);
    if (id === myId) {
        return NextResponse.json({ ok: false, error: "cannot_delete_self" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
    });
    if (!target) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // กันลบ ADMIN คนสุดท้าย
    if (target.role === "ADMIN") {
        const adminCount = await prisma.user.count({
            where: { role: "ADMIN", NOT: { id } },
        });
        if (adminCount === 0) {
            return NextResponse.json({ ok: false, error: "last_admin" }, { status: 400 });
        }
    }

    await prisma.user.delete({ where: { id } });

    // (ออปชัน) AuditLog
    try {
        await prisma.auditLog.create({
            data: {
                userId: myId || null,
                action: "DELETE",
                tableName: "User",
                recordId: id,
            },
        });
    } catch { }

    return NextResponse.json({ ok: true });
}

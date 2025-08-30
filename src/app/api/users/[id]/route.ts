// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";
import { UserUpdateSchema } from "@/lib/validators/user";
import { Prisma } from "@prisma/client";

const INTERNAL_DEPT_NAME = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";


export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = UserUpdateSchema.safeParse(bodyRaw);
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;

    const prev = await prisma.user.findUnique({ where: { id }, include: { department: true } });
    if (!prev) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    let nextDept: { id: number; name: string } | null = null;
    if (typeof body.departmentId !== "undefined") {
        nextDept = body.departmentId
            ? await prisma.department.findUnique({ where: { id: body.departmentId }, select: { id: true, name: true } })
            : null;
    } else if (prev.department) {
        nextDept = { id: prev.department.id, name: prev.department.name };
    }

    // กำหนดบทบาทอัตโนมัติ (ยกเว้น ADMIN)
    let computedRole = body.role ?? prev.role;
    if (computedRole !== "ADMIN") {
        computedRole = nextDept?.name === INTERNAL_DEPT_NAME ? "INTERNAL" : "EXTERNAL";
    }

    // กันลดสิทธิ์ ADMIN คนสุดท้าย
    if (prev.role === "ADMIN" && computedRole !== "ADMIN") {
        const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
        if (otherAdmins === 0) return NextResponse.json({ ok: false, error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน" }, { status: 400 });
    }

    const dataUpdate = {
        fullName: typeof body.fullName !== "undefined" ? body.fullName : prev.fullName,
        phone: typeof body.phone !== "undefined" ? body.phone : prev.phone,
        departmentId: typeof body.departmentId !== "undefined" ? body.departmentId : prev.departmentId,
        role: computedRole,
    };

    const noChange =
        dataUpdate.fullName === prev.fullName &&
        dataUpdate.phone === prev.phone &&
        dataUpdate.departmentId === prev.departmentId &&
        dataUpdate.role === prev.role;

    if (noChange) return NextResponse.json({ ok: true, data: prev, unchanged: true });

    const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id }, data: dataUpdate, include: { department: true } });

        await tx.auditLog.create({
            data: {
                userId: Number((ses as any).user?.id) || null,
                action: "UPDATE",
                tableName: "User",
                recordId: id,
                oldValue: {
                    departmentId: prev.departmentId,
                    departmentName: prev.department?.name ?? null,
                    role: prev.role,
                },
                newValue: {
                    departmentId: u.departmentId,
                    departmentName: u.department?.name ?? null,
                    role: u.role,
                    // จะไม่ใส่ undefined ลง JSON
                    ...(body.changeNote ? { changeNote: body.changeNote } : {}),
                },
            },
        });

        return u;
    });

    return NextResponse.json({ ok: true, data: updated });
}

// ---------- DELETE (ลบผู้ใช้) ----------
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const meId = Number((ses as any)?.user?.id) || null;

    const target = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, isActive: true },
    });
    if (!target) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    // กันลบบัญชีตัวเอง
    if (meId && meId === id) return NextResponse.json({ ok: false, error: "ไม่สามารถลบบัญชีของตนเองได้" }, { status: 400 });

    // กันลบ ADMIN คนสุดท้าย
    if (target.role === "ADMIN") {
        const otherAdminCount = await prisma.user.count({
            where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (otherAdminCount === 0) {
            return NextResponse.json({ ok: false, error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน" }, { status: 400 });
        }
    }

    const url = new URL(req.url);
    const hard = url.searchParams.get("hard");

    if (hard === "1" || hard === "true") {
        // ลบถาวร
        await prisma.$transaction(async (tx) => {
            await tx.user.delete({ where: { id } });
            await tx.auditLog.create({
                data: {
                    userId: meId,
                    action: "DELETE",
                    tableName: "User",
                    recordId: id,
                    oldValue: { role: target.role, isActive: target.isActive },
                    newValue: Prisma.DbNull, 
                },
            });
        });
        return NextResponse.json({ ok: true, deleted: true, soft: false });
    }

    // Soft delete (ปิดการใช้งาน)
    const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({ where: { id }, data: { isActive: false } });
        await tx.auditLog.create({
            data: {
                userId: meId,
                action: "UPDATE",
                tableName: "User",
                recordId: id,
                oldValue: { isActive: target.isActive },
                newValue: { isActive: false },
            },
        });
        return u;
    });

    return NextResponse.json({ ok: true, deleted: false, soft: true, data: updated });
}

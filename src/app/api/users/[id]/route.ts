import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";
import { UserUpdateSchema } from "@/lib/validators/user";

const INTERNAL_DEPT_NAME = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const id = Number(params.id);
    const bodyRaw = await req.json().catch(() => ({}));
    const parsed = UserUpdateSchema.safeParse(bodyRaw);
    if (!parsed.success) {
        return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    // ค่าปัจจุบัน (ไว้ทำ diff + audit)
    const prev = await prisma.user.findUnique({
        where: { id },
        include: { department: true },
    });
    if (!prev) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    // ถ้ามี departmentId ใหม่ → หาชื่อแผนก
    let nextDept = null as null | { id: number; name: string };
    if (typeof body.departmentId !== "undefined") {
        nextDept = body.departmentId
            ? await prisma.department.findUnique({ where: { id: body.departmentId }, select: { id: true, name: true } })
            : null;
    } else if (prev.department) {
        nextDept = { id: prev.department.id, name: prev.department.name };
    }

    // คำนวณ role ใหม่แบบ server-side (กัน client แอบยิง)
    let computedRole = body.role ?? prev.role; // allow ADMIN override
    if (computedRole !== "ADMIN") {
        const isInternal = nextDept?.name === INTERNAL_DEPT_NAME;
        computedRole = isInternal ? "INTERNAL" : "EXTERNAL";
    }

    const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.user.update({
            where: { id },
            data: {
                fullName: typeof body.fullName !== "undefined" ? body.fullName : prev.fullName,
                phone: typeof body.phone !== "undefined" ? body.phone : prev.phone,
                departmentId: typeof body.departmentId !== "undefined" ? body.departmentId : prev.departmentId,
                role: computedRole,
            },
            include: { department: true },
        });

        // บันทึก AuditLog
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
                    changeNote: body.changeNote ?? null,
                },
            },
        });

        return u;
    });

    return NextResponse.json({ ok: true, data: updated });
}

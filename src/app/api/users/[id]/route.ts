import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ADMIN_DEPT_NAME = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";
type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

function normRole(v: any, fallback?: Role): Role {
    const s = String(v ?? "").toUpperCase();
    if (s === "ADMIN" || s === "INTERNAL" || s === "EXTERNAL") return s;
    if (fallback) return fallback;
    throw new Error("invalid-role");
}
function parseIdMaybe(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}
async function ensureDepartmentIdByName(name: string) {
    let dep =
        (await prisma.department
            .findUnique({ where: { name } })
            .catch(() => null)) ||
        (await prisma.department.findFirst({ where: { name } })) ||
        (await prisma.department.create({ data: { name } }));
    return dep.id;
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session: any = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    const myRole = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (myRole !== "ADMIN")
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );

    const id = Number(params.id);
    if (!Number.isFinite(id))
        return NextResponse.json(
            { ok: false, error: "invalid-id" },
            { status: 400 }
        );

    const body = await req.json().catch(() => ({} as any));
    const fullName: string | undefined = body.fullName?.trim();
    const phone: string | null = body.phone ?? null;

    const current = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, departmentId: true, isActive: true },
    });
    if (!current)
        return NextResponse.json(
            { ok: false, error: "not-found" },
            { status: 404 }
        );

    // ไม่ auto เปลี่ยนเป็น INTERNAL อีกต่อไป
    const roleInput = body.role;
    let targetRole: Role = normRole(roleInput, current.role as Role);

    // กันลดสิทธิ์แอดมินคนสุดท้าย
    if (current.role === "ADMIN" && targetRole !== "ADMIN") {
        const otherAdmins = await prisma.user.count({
            where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (otherAdmins === 0) {
            return NextResponse.json(
                { ok: false, error: "cannot-demote-last-admin" },
                { status: 409 }
            );
        }
    }

    const data: any = {
        fullName: fullName ?? undefined,
        phone,
        role: targetRole,
    };

    const hasDepInPayload = Object.prototype.hasOwnProperty.call(
        body,
        "departmentId"
    );
    const depIdFromBody = parseIdMaybe(body.departmentId);

    if (targetRole === "EXTERNAL") {
        //  ภายนอก: อนุญาตให้เลือกกลุ่มงานได้
        if (hasDepInPayload) {
            if (depIdFromBody && typeof depIdFromBody === "number") {
                const dep = await prisma.department.findUnique({
                    where: { id: depIdFromBody },
                });
                if (!dep)
                    return NextResponse.json(
                        { ok: false, error: "department-not-found" },
                        { status: 404 }
                    );
                data.department = { connect: { id: depIdFromBody } };
            } else {
                // ส่ง null, '', undefined, 0, หรืออะไรก็ตามที่ไม่ใช่เลข id ที่ถูกต้อง = ล้างกลุ่มงาน
                data.department = { disconnect: true };
            }
        }
        // ถ้าไม่ส่ง departmentId มาเลย → ไม่แตะกลุ่มงาน
    } else if (targetRole === "INTERNAL") {
        // ภายใน: ต้องมี departmentId ที่ valid
        if (!depIdFromBody) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "department-required",
                    message: "ผู้ใช้ภายในต้องเลือกกลุ่มงาน",
                },
                { status: 400 }
            );
        }
        const depExists = await prisma.department.findUnique({
            where: { id: depIdFromBody },
        });
        if (!depExists)
            return NextResponse.json(
                { ok: false, error: "department-not-found" },
                { status: 404 }
            );
        data.department = { connect: { id: depIdFromBody } };
    } else if (targetRole === "ADMIN") {
        // แอดมิน: ผูกกับกลุ่มงานที่กำหนดไว้เสมอ
        const depId = await ensureDepartmentIdByName(ADMIN_DEPT_NAME);
        data.department = { connect: { id: depId } };
    }

    try {
        const updated = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                department: { select: { id: true, name: true } },
            },
        });
        return NextResponse.json({ ok: true, item: updated });
    } catch (e: any) {
        console.error("PATCH /api/users/[id] error:", e);
        return NextResponse.json(
            { ok: false, error: "server-error" },
            { status: 500 }
        );
    }
}

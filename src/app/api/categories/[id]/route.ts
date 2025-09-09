import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/categories/:id
 * - ต้องเป็น ADMIN
 * - ค่าเริ่มต้น: soft delete -> isActive=false
 * - ถ้าส่ง ?hard=1 -> ลบจริง แต่จะยอมเฉพาะเมื่อไม่มีครุภัณฑ์ในหมวดนั้น (otherwise 409)
 * - not-found -> 404
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session: any = await auth();
    if (!session) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }

    const hard = new URL(req.url).searchParams.get("hard") === "1";

    try {
        // เช็คว่ามีจริงก่อน
        await prisma.category.findUniqueOrThrow({ where: { id } });

        if (!hard) {
            // -------- Soft delete --------
            await prisma.category.update({
                where: { id },
                data: { isActive: false },
            });
            return NextResponse.json({ ok: true, hard: false }, { status: 200 });
        }

        // -------- Hard delete (ต้องไม่มีของอ้างอยู่) --------
        const equipmentCount = await prisma.equipment.count({ where: { categoryId: id } });
        if (equipmentCount > 0) {
            return NextResponse.json(
                { ok: false, error: "category-in-use", detail: { equipmentCount } },
                { status: 409 }
            );
        }

        await prisma.category.delete({ where: { id } });
        return NextResponse.json({ ok: true, hard: true }, { status: 200 });

    } catch (e: any) {
        // ไม่พบ
        if (e?.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
        }
        // กันกรณีโดน FK แม้เราจะเช็ค count แล้ว (เพื่อความชัวร์)
        if (e?.code === "P2003" || /Foreign key/i.test(e?.message ?? "")) {
            const equipmentCount =
                (await prisma.equipment.count({ where: { categoryId: id } }).catch(() => undefined)) ?? undefined;
            return NextResponse.json(
                { ok: false, error: "category-in-use", detail: { equipmentCount } },
                { status: 409 }
            );
        }
        console.error("DELETE /api/categories/:id error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

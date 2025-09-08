import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/categories/:id
 * - ต้องเป็น ADMIN
 * - ลบจริง (hard delete)
 * - not-found -> 404
 * - มีการอ้างอิงอยู่ (FK) -> 409 category-in-use
 */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
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

    try {
        // เช็คว่ามีจริงก่อน (จะ throw P2025 ถ้าไม่มี)
        await prisma.category.findUniqueOrThrow({ where: { id } });

        // ลบจริง
        await prisma.category.delete({ where: { id } });

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        // ไม่พบ
        if (e?.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
        }

        // ติด Foreign Key (ยังมีอุปกรณ์ใช้หมวดหมู่นี้อยู่)
        if (e?.code === "P2003" || /Foreign key/i.test(e?.message ?? "")) {
            // นับจำนวนเพื่อส่งรายละเอียด (ไม่ critical ถ้านับพลาด)
            const equipmentCount =
                (await prisma.equipment.count({ where: { categoryId: id } }).catch(() => undefined)) ??
                undefined;

            return NextResponse.json(
                { ok: false, error: "category-in-use", detail: { equipmentCount } },
                { status: 409 }
            );
        }

        console.error("DELETE /api/categories/:id error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
    "NORMAL",
    "IN_USE",
    "BROKEN",
    "LOST",
    "WAIT_DISPOSE",
    "DISPOSED",
]);

/** ---------- GET /api/equipment/:id (อ่านทีละตัว) ---------- */
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }

    try {
        const row = await prisma.equipment.findUnique({
            where: { number: id },
            select: {
                number: true,
                code: true,
                idnum: true,
                name: true,
                description: true,
                status: true,
                statusNote: true,
                receivedDate: true,
                price: true,
                currentRequestId: true,
                category: { select: { id: true, name: true } },
            },
        });
        if (!row) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
        return NextResponse.json({ ok: true, data: row });
    } catch (e: any) {
        console.error("[GET /api/equipment/:id]", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

/** ---------- PATCH /api/equipment/:id (แก้ไข) ---------- */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
    }

    // ดึงของเดิมมาก่อนเพื่อเช็กเงื่อนไขการเปลี่ยนสถานะ
    const current = await prisma.equipment.findUnique({
        where: { number: id },
        select: { number: true, status: true, currentRequestId: true },
    });
    if (!current) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

    const updates: any = {};
    if (body.code != null) updates.code = String(body.code).trim();
    if (body.name != null) updates.name = String(body.name).trim();
    if (body.description != null) updates.description = String(body.description).trim();
    if (body.idnum != null) updates.idnum = String(body.idnum).trim();
    if (body.categoryId != null) updates.categoryId = Number(body.categoryId);
    if (body.receivedDate != null) updates.receivedDate = new Date(body.receivedDate);
    if (body.price != null && String(body.price).trim() !== "") updates.price = String(body.price); // Decimal
    if (body.statusNote != null) updates.statusNote = String(body.statusNote);

    // การแก้ไขสถานะ: กัน IN_USE ให้จัดการผ่านฟลว์ borrow เท่านั้น
    if (body.status != null) {
        const newStatus = String(body.status).toUpperCase();
        if (!ALLOWED_STATUS.has(newStatus)) {
            return NextResponse.json({ ok: false, error: "invalid-status" }, { status: 400 });
        }
        // ห้ามเซ็ตเป็น IN_USE ด้วยมือ
        if (newStatus === "IN_USE") {
            return NextResponse.json({ ok: false, error: "cannot-set-in-use-manually" }, { status: 409 });
        }
        // ของกำลังถูกยืมอยู่ → ห้ามแก้สถานะด้วยมือ (ให้ return/approve/reject เท่านั้น)
        if (current.status === "IN_USE" && current.currentRequestId) {
            return NextResponse.json(
                { ok: false, error: "in-use-by-request", detail: { requestId: current.currentRequestId } },
                { status: 409 }
            );
        }
        updates.status = newStatus as any;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ ok: false, error: "no-updates" }, { status: 400 });
    }

    try {
        const updated = await prisma.equipment.update({
            where: { number: id },
            data: updates,
            select: {
                number: true,
                code: true,
                idnum: true,
                name: true,
                description: true,
                status: true,
                statusNote: true,
                receivedDate: true,
                price: true,
                currentRequestId: true,
                category: { select: { id: true, name: true } },
            },
        });
        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        if (e?.code === "P2002") {
            // unique ซ้ำ (code / [categoryId,idnum])
            return NextResponse.json({ ok: false, error: "duplicate-unique" }, { status: 409 });
        }
        if (e?.code === "P2003") {
            // FK ไม่ถูกต้อง เช่น categoryId ไม่มี
            return NextResponse.json({ ok: false, error: "invalid-category" }, { status: 400 });
        }
        console.error("[PATCH /api/equipment/:id]", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

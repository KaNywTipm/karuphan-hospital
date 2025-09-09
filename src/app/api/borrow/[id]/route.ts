import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Helper: include เดียวกันทั้ง GET/PATCH */
const borrowInclude = {
    requester: { select: { id: true, fullName: true, phone: true, department: { select: { name: true } } } },
    approvedBy: { select: { id: true, fullName: true } },
    receivedBy: { select: { id: true, fullName: true } },
    items: {
        include: {
            equipment: { select: { number: true, code: true, name: true, status: true } },
        },
    },
} as const;

/** GET /api/borrow/:id → รายละเอียดคำขอ */
export async function GET(_: Request, { params }: { params: { id: string } }) {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
        return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }

    try {
        const row = await prisma.borrowRequest.findUnique({
            where: { id },
            include: borrowInclude,
        });
        if (!row) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });

        // คำนวณ OVERDUE แบบไดนามิก
        const overdue =
            row.status === "APPROVED" &&
            row.returnDue &&
            new Date(row.returnDue).getTime() < Date.now() &&
            !row.actualReturnDate;

        const data = overdue ? { ...row, status: "OVERDUE" as const } : row;
        return NextResponse.json({ ok: true, data }, { status: 200 });
    } catch (e) {
        console.error("[GET /api/borrow/:id] error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

/**
 * PATCH /api/borrow/:id
 * อนุญาตแก้แค่: returnDue, reason, notes
 * (approve/reject/return แยกอยู่ที่ /approve, /reject, /return)
 */
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

    // เตรียมฟิลด์ที่อนุญาตให้แก้
    const data: any = {};
    if (body.returnDue != null) data.returnDue = new Date(body.returnDue);
    if (body.reason != null) data.reason = String(body.reason);
    if (body.notes != null) data.notes = String(body.notes);

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: false, error: "no-updates" }, { status: 400 });
    }

    try {
        // ป้องกันแก้ไขหลังปิดเคสแล้ว
        const current = await prisma.borrowRequest.findUnique({ where: { id }, select: { status: true } });
        if (!current) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
        if (current.status === "RETURNED" || current.status === "REJECTED") {
            return NextResponse.json({ ok: false, error: "closed-request" }, { status: 409 });
        }

        const updated = await prisma.borrowRequest.update({
            where: { id },
            data,
            include: borrowInclude,
        });

        // คำนวณ OVERDUE ให้ผลลัพธ์
        const overdue =
            updated.status === "APPROVED" &&
            updated.returnDue &&
            new Date(updated.returnDue).getTime() < Date.now() &&
            !updated.actualReturnDate;

        const resp = overdue ? { ...updated, status: "OVERDUE" as const } : updated;
        return NextResponse.json({ ok: true, data: resp }, { status: 200 });
    } catch (e) {
        console.error("[PATCH /api/borrow/:id] error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

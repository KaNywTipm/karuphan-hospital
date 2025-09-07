import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ItemIn = { equipmentId: number | string; qty?: number; quantity?: number };

export async function GET(req: Request) {
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const statusParam = (searchParams.get("status") || "").toUpperCase();

    const where: any = {};
    if (["PENDING", "APPROVED", "RETURNED", "REJECTED"].includes(statusParam)) where.status = statusParam;

    const requests = await prisma.borrowRequest.findMany({
        where,
        orderBy: { id: "desc" }, // ใช้ id เรียงจากล่าสุด
        include: {
            requester: { select: { fullName: true, department: { select: { name: true } } } },
            receivedBy: { select: { fullName: true } } as any, // ถ้าไม่มี relation นี้ใน schema จะไม่ถูกใช้
            items: { include: { equipment: { select: { number: true, name: true } } } },
        },
    });

    // แบนราบต่อ item
    const rows = requests.flatMap((r) => {
        const base = {
            id: r.id,
            status: r.status as "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE",
            borrowerName: r.requester?.fullName ?? null,
            department: r.requester?.department?.name ?? null,
            borrowerType: (r as any).borrowerType ?? null,
            borrowDate: ((r as any).createdAt ?? (r as any).requestDate ?? null)?.toISOString?.() ?? null,
            returnDue: (r as any).returnDue?.toISOString?.() ?? null,
            actualReturnDate: (r as any).actualReturnDate?.toISOString?.() ?? null,
            reason: (r as any).reason ?? (r as any).notes ?? null,
            receivedBy: (r as any).receivedBy?.fullName ?? null,
            returnCondition: (r as any).returnCondition ?? null,
        };
        if (!r.items?.length) return [{ ...base, equipmentCode: "", equipmentName: "" }];
        return r.items.map((it) => ({
            ...base,
            equipmentCode: String(it.equipment?.number ?? it.equipmentId),
            equipmentName: it.equipment?.name ?? "",
        }));
    });

    const filtered = q
        ? rows.filter((x) =>
            (x.borrowerName || "").toLowerCase().includes(q) ||
            (x.department || "").toLowerCase().includes(q) ||
            (x.equipmentCode || "").toLowerCase().includes(q) ||
            (x.equipmentName || "").toLowerCase().includes(q)
        )
        : rows;

    return NextResponse.json({ ok: true, data: filtered });
}

export async function POST(req: Request) {
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    const email = session.user?.email ?? null;

    // หา requesterId (fallback จาก email ถ้า session.user.id ไม่มี)
    let requesterId = Number(session.user?.id);
    if (!Number.isFinite(requesterId) || requesterId <= 0) {
        if (!email) return NextResponse.json({ ok: false, error: "no-email-in-session" }, { status: 401 });
        const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (!u) return NextResponse.json({ ok: false, error: "user-not-found" }, { status: 401 });
        requesterId = u.id;
    }
    if (!["INTERNAL", "EXTERNAL"].includes(role)) {
        return NextResponse.json({ ok: false, error: "forbidden-role", detail: { role } }, { status: 403 });
    }

    try {
        const body = await req.json();
        const itemsIn: ItemIn[] = Array.isArray(body?.items) ? body.items : [];
        if (itemsIn.length === 0) return NextResponse.json({ ok: false, error: "กรุณาเลือกครุภัณฑ์" }, { status: 400 });

        const dueRaw: string | undefined = body?.returnDue ?? body?.dueDate;
        const returnDue = dueRaw ? new Date(dueRaw) : null;
        if (!returnDue || isNaN(returnDue.getTime())) {
            return NextResponse.json({ ok: false, error: "Missing or invalid returnDue" }, { status: 400 });
        }
        const notes: string | null = body?.notes ?? body?.note ?? null;

        // ตรวจความพร้อมของอุปกรณ์
        const numbers = itemsIn.map(i => Number(i.equipmentId));
        const found = await prisma.equipment.findMany({ where: { number: { in: numbers } }, select: { number: true, status: true } });
        const notFound = numbers.filter(n => !found.find(f => f.number === n));
        if (notFound.length) return NextResponse.json({ ok: false, error: "equipment-not-found", detail: { numbers: notFound } }, { status: 400 });
        const busy = found.filter(f => f.status !== "NORMAL");
        if (busy.length) return NextResponse.json({ ok: false, error: "equipment-busy", detail: { numbers: busy.map(b => b.number) } }, { status: 409 });

        // ภายนอกต้องรออนุมัติ; INTERNAL จะให้ auto-approve ค่อยเปลี่ยนค่าด้านล่าง
        const shouldAutoApprove = false;

        const created = await prisma.$transaction(async (tx) => {
            const r = await tx.borrowRequest.create({
                data: {
                    borrowerType: role as "INTERNAL" | "EXTERNAL",
                    requesterId,
                    status: shouldAutoApprove ? "APPROVED" : "PENDING",
                    approvedAt: shouldAutoApprove ? new Date() : null,
                    returnDue,
                    notes,
                    items: {
                        create: itemsIn.map((i) => ({
                            equipmentId: Number(i.equipmentId), // อ้างอิง equipment.number
                            quantity: Number(i.qty ?? i.quantity ?? 1),
                        })),
                    },
                },
                include: { items: true },
            });

            if (shouldAutoApprove && r.items.length > 0) {
                await Promise.all(
                    r.items.map((i) =>
                        tx.equipment.update({ where: { number: Number(i.equipmentId) }, data: { status: "IN_USE" } })
                    )
                );
            }
            return r;
        });

        return NextResponse.json({ ok: true, data: created });
    } catch (err: any) {
        console.error("POST /api/borrow error:", err);
        return NextResponse.json({ ok: false, error: err?.message ?? "server error" }, { status: 500 });
    }
}

export async function OPTIONS() { return NextResponse.json({}, { status: 200 }); }

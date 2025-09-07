import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** รองรับทั้ง TH/EN และ enum ตรง ๆ */
function toReturnCondition(input: any):
    "NORMAL" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED" | null {
    if (!input) return "NORMAL";
    const s = String(input).trim().toUpperCase();
    switch (s) {
        case "NORMAL": case "ปกติ": return "NORMAL";
        case "BROKEN": case "ชำรุด": return "BROKEN";
        case "LOST": case "สูญหาย": return "LOST";
        case "WAIT_DISPOSE": case "รอจำหน่าย": return "WAIT_DISPOSE";
        case "DISPOSED": case "จำหน่ายแล้ว": return "DISPOSED";
        default: return null;
    }
}

/** แปลงวันที่ (กันเคส พ.ศ. และ YYYY-MM-DD) */
function normalizeDate(d?: string | null) {
    if (!d) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-").map(Number);
        const year = y > 2400 ? y - 543 : y;
        return new Date(Date.UTC(year, m - 1, day));
    }
    const iso = new Date(d);
    return isNaN(iso.getTime()) ? new Date() : iso;
}

async function handleReturn(req: Request, params: { id: string }) {
    // 1) ตรวจสิทธิ์
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });

    // 2) รับ payload
    const body = await req.json().catch(() => ({}));
    const returnedAt = normalizeDate(body.actualReturnDate ?? body.returnedAt);
    const cond = toReturnCondition(body.returnCondition ?? body.condition);
    const notes: string | undefined = body.returnNotes ?? body.notes ?? undefined;
    if (!cond) return NextResponse.json({ ok: false, error: "invalid returnCondition" }, { status: 400 });

    const receiverId = Number((session.user as any)?.id || 0) || null;

    try {
        const updated = await prisma.$transaction(async (tx) => {
            // 3) ดึงคำขอ
            const br = await tx.borrowRequest.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!br) throw new Error("not_found");
            if (br.status !== "APPROVED") throw new Error("only_approved");

            // 4) อัปเดตคำขอเป็น RETURNED
            const u = await tx.borrowRequest.update({
                where: { id },
                data: {
                    status: "RETURNED",
                    actualReturnDate: returnedAt,    // ถ้า schema ไม่มี ให้ลบฟิลด์นี้ออก
                    returnCondition: cond,           // ต้องมี enum ใน model
                    returnNotes: notes,
                    receivedById: receiverId,        // ถ้าไม่มี FK นี้ ให้ตัดออก
                },
            });

            // 5) อัปเดตสถานะครุภัณฑ์ตามผลคืน (อ้างอิงด้วย number)
            const equipmentStatus =
                cond === "BROKEN" ? "BROKEN" :
                    cond === "LOST" ? "LOST" :
                        cond === "WAIT_DISPOSE" ? "WAIT_DISPOSE" :
                            cond === "DISPOSED" ? "DISPOSED" : "NORMAL";

            await Promise.all(
                br.items.map((it) =>
                    tx.equipment.update({
                        where: { number: it.equipmentId }, // ✅ ใช้ number ตามสคีมาของคุณ
                        data: { status: equipmentStatus },
                    })
                )
            );

            // (อ็อปชัน) บันทึก log
            try {
                await tx.auditLog.create({
                    data: {
                        userId: receiverId,
                        action: "RETURN",
                        tableName: "BorrowRequest",
                        recordId: id,
                        oldValue: { status: br.status },
                        newValue: { status: "RETURNED", returnCondition: cond },
                    },
                });
            } catch { /* ไม่มีตารางก็ข้ามได้ */ }

            return u;
        });

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        if (e?.message === "not_found")
            return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
        if (e?.message === "only_approved")
            return NextResponse.json({ ok: false, error: "only-approved" }, { status: 400 });
        console.error("return error:", e);
        return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
    }
}

// รองรับทั้ง PATCH (ของเดิม) และ POST (ของใหม่)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    return handleReturn(req, params);
}
export async function POST(req: Request, { params }: { params: { id: string } }) {
    return handleReturn(req, params);
}

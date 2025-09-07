// src/app/api/borrow/[id]/return/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

async function handle(req: Request, idParam: string) {
    const session: any = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const id = Number(idParam);
    const payload = await req.json().catch(() => ({}));
    const returnedAt = normalizeDate(payload.actualReturnDate ?? payload.returnedAt);
    const cond = toReturnCondition(payload.returnCondition ?? payload.condition);
    const notes: string | undefined = payload.returnNotes ?? payload.notes ?? undefined;
    if (!cond) return NextResponse.json({ ok: false, error: "invalid returnCondition" }, { status: 400 });

    const receiverId = Number((session.user as any)?.id || 0) || null;

    try {
        const br = await prisma.borrowRequest.findUnique({ where: { id }, include: { items: true } });
        if (!br) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
        if (br.status !== "APPROVED") return NextResponse.json({ ok: false, error: "only-approved" }, { status: 400 });

        await prisma.$transaction(async (tx) => {
            await tx.borrowRequest.update({
                where: { id },
                data: {
                    status: "RETURNED",
                    actualReturnDate: returnedAt as any,
                    returnCondition: cond as any,
                    returnNotes: notes,
                    receivedById: receiverId as any,
                },
            });

            const equipmentStatus =
                cond === "BROKEN" ? "BROKEN" :
                    cond === "LOST" ? "LOST" :
                        cond === "WAIT_DISPOSE" ? "WAIT_DISPOSE" :
                            cond === "DISPOSED" ? "DISPOSED" : "NORMAL";

            await Promise.all(
                br.items.map((it) =>
                    tx.equipment.update({
                        where: { number: it.equipmentId }, // อ้างอิง number
                        data: { status: equipmentStatus as any },
                    })
                )
            );

            // ถ้ามีตาราง auditLog ค่อยบันทึก (ไม่มีจะ throw → ล้อม try/catch)
            try {
                await tx.auditLog.create({
                    data: {
                        userId: receiverId as any,
                        action: "RETURN",
                        tableName: "BorrowRequest",
                        recordId: id,
                        oldValue: { status: br.status } as any,
                        newValue: { status: "RETURNED", returnCondition: cond } as any,
                    },
                });
            } catch { }
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("return error:", e);
        return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) { return handle(req, params.id); }
export async function POST(req: Request, { params }: { params: { id: string } }) { return handle(req, params.id); }

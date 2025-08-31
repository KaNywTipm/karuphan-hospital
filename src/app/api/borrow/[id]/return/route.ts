import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// รองรับทั้ง label ภาษาไทย/อังกฤษ และ enum ตรง ๆ
function toReturnCondition(input: any):
    | "NORMAL"
    | "BROKEN"
    | "LOST"
    | "WAIT_DISPOSE"
    | "DISPOSED"
    | null {
    if (!input) return "NORMAL";
    const s = String(input).trim().toUpperCase();
    switch (s) {
        case "NORMAL":
        case "ปกติ":
            return "NORMAL";
        case "BROKEN":
        case "ชำรุด":
            return "BROKEN";
        case "LOST":
        case "สูญหาย":
            return "LOST";
        case "WAIT_DISPOSE":
        case "รอจำหน่าย":
            return "WAIT_DISPOSE";
        case "DISPOSED":
        case "จำหน่ายแล้ว":
            return "DISPOSED";
        default:
            return null;
    }
}

// แปลงวันที่ให้ชัวร์ (เผื่อเผลอส่ง พ.ศ. มา)
function normalizeDate(d?: string | null) {
    if (!d) return new Date();
    // เคสส่ง "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split("-").map(Number);
        const year = y > 2400 ? y - 543 : y; // เผื่อเป็น พ.ศ.
        return new Date(Date.UTC(year, m - 1, day));
    }
    // เคส ISO
    const iso = new Date(d);
    if (!isNaN(iso.getTime())) return iso;
    return new Date();
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const id = Number(params.id);
        if (!Number.isFinite(id)) {
            return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const returnedAt = normalizeDate(body.actualReturnDate);
        const cond = toReturnCondition(body.returnCondition);
        const notes: string | undefined = body.returnNotes ?? undefined;

        if (!cond) {
            return NextResponse.json(
                { ok: false, error: "invalid returnCondition" },
                { status: 400 }
            );
        }

        const userId = Number((session.user as any).id || 0);

        const updated = await prisma.$transaction(async (tx) => {
            // ดึงคำขอพร้อมรายการครุภัณฑ์
            const br = await tx.borrowRequest.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!br) throw new Error("not_found");

            // อัปเดตคำขอเป็น RETURNED
            const u = await tx.borrowRequest.update({
                where: { id },
                data: {
                    status: "RETURNED",
                    actualReturnDate: returnedAt,
                    returnCondition: cond,
                    returnNotes: notes,
                    receivedById: userId || null,
                },
            });

            // สถานะครุภัณฑ์ภายหลังรับคืน
            const equipmentStatus:
                | "NORMAL"
                | "IN_USE"
                | "BROKEN"
                | "LOST"
                | "WAIT_DISPOSE"
                | "DISPOSED" =
                cond === "BROKEN"
                    ? "BROKEN"
                    : cond === "LOST"
                        ? "LOST"
                        : cond === "WAIT_DISPOSE"
                            ? "WAIT_DISPOSE"
                            : cond === "DISPOSED"
                                ? "DISPOSED"
                                : "NORMAL";

            // อัปเดตสถานะครุภัณฑ์ทุกชิ้นในคำขอนี้
            await Promise.all(
                br.items.map((it) =>
                    tx.equipment.update({
                        where: { number: it.equipmentId },
                        data: { status: equipmentStatus },
                    })
                )
            );

            // (อ็อปชัน) Log
            await tx.auditLog.create({
                data: {
                    userId: userId || null,
                    action: "RETURN",
                    tableName: "BorrowRequest",
                    recordId: id,
                    oldValue: { status: br.status },
                    newValue: { status: "RETURNED", returnCondition: cond },
                },
            });

            return u;
        });

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        if (e?.message === "not_found")
            return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
        console.error("return PATCH error:", e);
        return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
    }
}

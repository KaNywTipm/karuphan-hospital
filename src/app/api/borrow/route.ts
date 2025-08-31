// src/app/api/borrow/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

/* ============================
 *  Admin: GET /api/borrow
 *  (ยังคงแบบเดิม แต่กันสิทธิ์ให้ ADMIN เท่านั้น)
 * ============================ */
export async function GET() {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session || role !== "ADMIN") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const rows = await prisma.borrowRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            requester: { select: { fullName: true, department: { select: { name: true } } } },
            items: { include: { equipment: true } },
        },
    });

    // map เป็น shape ที่หน้า UI ฝั่งแอดมินใช้งาน
    const data = rows.map((r) => ({
        id: r.id,
        status: r.status,
        borrowerName:
            r.borrowerType === "INTERNAL"
                ? r.requester?.fullName ?? "-"
                : r.externalName ?? "-",
        department:
            r.borrowerType === "INTERNAL"
                ? r.requester?.department?.name ?? "-"
                : r.externalDept ?? "-",
        equipmentCode: r.items.map((i) => i.equipment.code).join(", "),
        equipmentName: r.items.map((i) => i.equipment.name).join(", "),
        borrowDate: r.borrowDate?.toISOString() ?? null,
        returnDue: r.returnDue.toISOString(),
        actualReturnDate: r.actualReturnDate?.toISOString() ?? null,
        reason: r.reason ?? "",
    }));

    return NextResponse.json({ ok: true, data });
}

/* ============================
 *  User: POST /api/borrow
 *  ยืม “ทีละชิ้น” ตามที่ตกลงกัน
 *  - INTERNAL: อนุมัติทันที (APPROVED) และเปลี่ยนสถานะอุปกรณ์เป็น IN_USE
 *  - EXTERNAL: สร้างคำขอ PENDING (รอแอดมินอนุมัติ)
 * ============================ */

const BorrowSingle = z.object({
    borrowerType: z.enum(["internal", "external"]),
    equipmentId: z.number().int().positive().optional(),
    equipmentCode: z.string().trim().optional(),
    quantity: z.number().int().min(1).default(1),
    reason: z.string().trim().optional(),
    // ส่งเป็น AD (YYYY-MM-DD) หรือ ISO ได้
    returnDue: z.union([z.string(), z.date()]),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const parsed = BorrowSingle.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const body = parsed.data;

        // หา equipmentId จาก code ถ้ายังไม่ได้ส่งมา
        let equipmentId = body.equipmentId;
        if (!equipmentId && body.equipmentCode) {
            const eqByCode = await prisma.equipment.findUnique({
                where: { code: body.equipmentCode },
                select: { number: true },
            });
            if (!eqByCode) {
                return NextResponse.json({ ok: false, error: "ไม่พบครุภัณฑ์" }, { status: 404 });
            }
            equipmentId = eqByCode.number;
        }
        if (!equipmentId) {
            return NextResponse.json({ ok: false, error: "ต้องระบุครุภัณฑ์" }, { status: 400 });
        }

        // ตรวจสถานะอุปกรณ์
        const eq = await prisma.equipment.findUnique({
            where: { number: equipmentId },
            select: { status: true, name: true, code: true },
        });
        if (!eq) return NextResponse.json({ ok: false, error: "ไม่พบครุภัณฑ์" }, { status: 404 });
        if (eq.status !== "NORMAL") {
            return NextResponse.json({ ok: false, error: "ครุภัณฑ์ไม่ว่าง" }, { status: 409 });
        }

        // เตรียมค่าพื้นฐาน
        const isInternal = body.borrowerType === "internal";
        const requesterId = Number((session.user as any).id);
        const returnDue =
            body.returnDue instanceof Date ? body.returnDue : new Date(body.returnDue as string);
        const now = new Date();

        // transaction: สร้างคำขอ + (สำหรับ internal) อัปเดตสถานะอุปกรณ์
        const created = await prisma.$transaction(async (tx) => {
            const reqRow = await tx.borrowRequest.create({
                data: {
                    borrowerType: isInternal ? "INTERNAL" : "EXTERNAL",
                    requesterId: isInternal ? requesterId : null,
                    status: isInternal ? "APPROVED" : "PENDING",
                    borrowDate: isInternal ? now : null,
                    approvedAt: isInternal ? now : null,
                    approvedById: isInternal ? requesterId : null,
                    returnDue,
                    reason: body.reason ?? null,
                    items: {
                        create: {
                            equipmentId,
                            quantity: body.quantity ?? 1,
                        },
                    },
                },
                include: { items: { include: { equipment: true } } },
            });

            if (isInternal) {
                await tx.equipment.update({
                    where: { number: equipmentId! },
                    data: { status: "IN_USE" },
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: requesterId,
                    action: "CREATE",
                    tableName: "BorrowRequest",
                    recordId: reqRow.id,
                    newValue: { borrowerType: reqRow.borrowerType, status: reqRow.status, equipmentId },
                },
            });

            return reqRow;
        });

        return NextResponse.json({ ok: true, data: created });
    } catch (e: any) {
        const message = e?.message || "เกิดข้อผิดพลาด";
        return NextResponse.json({ ok: false, error: message }, { status: 400 });
    }
}

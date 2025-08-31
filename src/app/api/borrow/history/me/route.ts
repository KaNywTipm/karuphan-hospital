import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    if (!Number.isFinite(userId)) {
        return NextResponse.json({ ok: false, error: "invalid_user" }, { status: 400 });
    }

    // ใช้สำหรับจับคู่ external เก่าที่ไม่ได้ผูก requesterId
    const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, phone: true },
    });

    // สร้าง OR เงื่อนไขแบบ type-safe
    const whereOr: Prisma.BorrowRequestWhereInput[] = [{ requesterId: userId }];
    if (profile?.fullName) whereOr.push({ borrowerType: "EXTERNAL", externalName: profile.fullName });
    if (profile?.phone) whereOr.push({ borrowerType: "EXTERNAL", externalPhone: profile.phone });

    const requests = await prisma.borrowRequest.findMany({
        where: { OR: whereOr },
        orderBy: { createdAt: "desc" },
        // ใช้ select แทน include → TS รู้จักชนิดของ items แน่นอน
        select: {
            id: true,
            borrowDate: true,
            returnDue: true,
            actualReturnDate: true,
            status: true,
            reason: true,
            items: {
                select: {
                    equipment: { select: { name: true, code: true } },
                },
            },
        },
    });

    // แปลงเป็นแถว ๆ (1 รายการครุภัณฑ์ = 1 แถว)
    const rows = requests.flatMap((r) =>
        r.items.map((it) => ({
            requestId: r.id,
            borrowDate: r.borrowDate,
            returnDue: r.returnDue,
            actualReturnDate: r.actualReturnDate,
            status: r.status,             // PENDING | APPROVED | RETURNED | REJECTED | OVERDUE
            reason: r.reason ?? "",
            equipmentName: it.equipment.name,
            equipmentCode: it.equipment.code,
        }))
    );

    return NextResponse.json({ ok: true, items: rows });
}

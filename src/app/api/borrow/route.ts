import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const role = String((session.user as any).role || "");
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    // ดึงล่าสุดก่อน ตามที่หน้า UI ใช้
    const rows = await prisma.borrowRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            requester: { select: { fullName: true, department: { select: { name: true } } } },
            items: { include: { equipment: { select: { code: true, name: true } } } },
        },
    });

    const data = rows.map((r) => ({
        id: r.id,
        status: r.status,
        borrowerType: r.borrowerType,
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
        returnDue: r.returnDue?.toISOString() ?? null,
        actualReturnDate: r.actualReturnDate?.toISOString() ?? null,
        reason: r.reason ?? null,
        receivedBy: null,          // หน้านี้โชว์เฉพาะบางแท็บ ถ้ามีจะเติมจาก detail อีกที
        returnCondition: r.returnCondition ?? null,
    }));

    return NextResponse.json({ ok: true, data });
}

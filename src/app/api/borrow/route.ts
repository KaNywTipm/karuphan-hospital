import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const rows = await prisma.borrowRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            requester: { select: { fullName: true, department: { select: { name: true } } } },
            items: { include: { equipment: true } },
        },
    });

    // map เป็น shape ที่หน้า UI ใช้ง่าย
    const data = rows.map(r => ({
        id: r.id,
        status: r.status,
        borrowerName: r.borrowerType === "INTERNAL" ? r.requester?.fullName ?? "-" : r.externalName ?? "-",
        department: r.borrowerType === "INTERNAL" ? (r.requester?.department?.name ?? "-") : (r.externalDept ?? "-"),
        equipmentCode: r.items.map(i => i.equipment.code).join(", "),
        equipmentName: r.items.map(i => i.equipment.name).join(", "),
        borrowDate: r.borrowDate?.toISOString() ?? null,
        returnDue: r.returnDue.toISOString(),
        actualReturnDate: r.actualReturnDate?.toISOString() ?? null,
        reason: r.reason ?? "",
    }));

    return NextResponse.json({ ok: true, data });
}

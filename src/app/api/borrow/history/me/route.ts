import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ให้รีเฟรชทุกครั้ง
export const dynamic = "force-dynamic";

// ตัวช่วย: แปลง BorrowRequest -> แถวที่ UI ใช้ได้ทันที
function flattenBorrowRequests(list: any[]) {
    const rows: any[] = [];
    for (const req of list) {
        // ใช้วันที่สร้างคำขอยืม (createdAt) เป็นวันกำหนดยืมเสมอ
        const borrowDate = req.createdAt ?? null;
        const returnDue = req.returnDue ?? null;
        const actualReturnDate = req.actualReturnDate ?? null;
        const status = String(req.status).toUpperCase();
        const reason = req.rejectReason ?? req.reason ?? req.notes ?? "";

        // เลือกชื่อผู้อนุมัติ/รับคืน ตามสถานะ
        let approverOrReceiver = "-";
        if (status === "APPROVED" || status === "OVERDUE") {
            approverOrReceiver = req.approvedBy?.fullName ?? "-";
        } else if (status === "RETURNED") {
            approverOrReceiver = req.receivedBy?.fullName ?? "-";
        } else if (status === "REJECTED") {
            approverOrReceiver = req.rejectedBy?.fullName ?? "-";
        }

        const items = Array.isArray(req.items) ? req.items : [];
        if (!items.length) {
            rows.push({
                id: req.id,
                status,
                borrowDate,
                returnDue,
                actualReturnDate,
                reason,
                equipmentName: "-",
                equipmentCode: "-",
                approverOrReceiver,
            });
            continue;
        }
        for (const it of items) {
            // ดึงเลขครุภัณฑ์และชื่อครุภัณฑ์จาก it.equipment ให้ถูกต้อง
            let equipmentName = "-";
            let equipmentCode = "-";
            if (it && typeof it === "object" && it.equipment) {
                equipmentName = it.equipment.name ?? "-";
                equipmentCode =
                    it.equipment.number !== undefined && it.equipment.number !== null
                        ? String(it.equipment.number)
                        : it.equipmentId !== undefined
                            ? String(it.equipmentId)
                            : "-";
            }
            rows.push({
                id: req.id,
                status,
                borrowDate,
                returnDue,
                actualReturnDate,
                reason,
                equipmentName,
                equipmentCode,
                approverOrReceiver,
            });
        }
    }
    return rows;
}

export async function GET(req: Request) {
    const session: any = await auth();
    if (!session?.user?.id) {
        return NextResponse.json(
            { ok: false, error: "unauthorized" },
            { status: 401 }
        );
    }

    const url = new URL(req.url);
    const onlyPending =
        url.searchParams.get("only") === "pending" ||
        url.searchParams.get("pending") === "1";

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.max(
        1,
        Math.min(200, Number(url.searchParams.get("pageSize") || 200))
    );

    // --- เงื่อนไข "ประวัติของฉัน" ---
    // INTERNAL: กรอง requesterId ตรง user.id
    // EXTERNAL: กรอง externalName หรือ externalPhone ตรง user
    const userId = Number(session.user.id);
    const fullName = String(
        session.user.fullName ?? session.user.name ?? ""
    ).trim();
    const phone = String(session.user.phone ?? "").trim();
    const userRole = String(session.user.role ?? "").toUpperCase();

    let baseWhere: any = {};
    if (userRole === "INTERNAL" || userRole === "ADMIN") {
        // เฉพาะ INTERNAL/ADMIN: กรอง requesterId
        baseWhere = { requesterId: userId };
    } else if (userRole === "EXTERNAL") {
        // เฉพาะ EXTERNAL: กรอง externalName หรือ externalPhone
        baseWhere = {
            borrowerType: "EXTERNAL",
            OR: [
                fullName ? { externalName: fullName } : undefined,
                phone ? { externalPhone: phone } : undefined,
            ].filter(Boolean),
        };
    } else {
        // ไม่รู้ role: ไม่คืนข้อมูล
        return NextResponse.json(
            { ok: false, error: "forbidden" },
            { status: 403 }
        );
    }

    // --- เงื่อนไขสถานะ ---
    if (onlyPending) {
        baseWhere.status = "PENDING";
    } else {
        baseWhere.status = { not: "PENDING" };
    }

    try {
        const [total, list] = await Promise.all([
            prisma.borrowRequest.count({ where: baseWhere }),
            prisma.borrowRequest.findMany({
                where: baseWhere,
                orderBy: { createdAt: "desc" },
                include: {
                    approvedBy: { select: { fullName: true } },
                    receivedBy: { select: { fullName: true } },
                    rejectedBy: { select: { fullName: true } },
                    items: {
                        include: {
                            equipment: { select: { number: true, name: true } },
                        },
                    },
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        const rows = flattenBorrowRequests(list);

        return NextResponse.json(
            {
                ok: true,
                page,
                pageSize,
                total,
                data: rows,
            },
            { status: 200 }
        );
    } catch (e) {
        console.error("GET /api/borrow/history/me error:", e);
        return NextResponse.json(
            { ok: false, error: "server-error" },
            { status: 500 }
        );
    }
}

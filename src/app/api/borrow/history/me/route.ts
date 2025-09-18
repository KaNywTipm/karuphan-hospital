import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ให้รีเฟรชทุกครั้ง
export const dynamic = "force-dynamic";

// ตัวช่วย: แปลง BorrowRequest -> แถวที่ UI ใช้ได้ทันที
function flattenBorrowRequests(list: any[]) {
    const rows: any[] = [];
    for (const req of list) {
        const borrowDate =
            req.requestedAt ?? req.createdAt ?? req.requestDate ?? null;
        const returnDue = req.returnDue ?? null;
        const actualReturnDate = req.actualReturnDate ?? null;
        const status = String(req.status).toUpperCase();
        const reason = req.rejectReason ?? req.reason ?? req.notes ?? "";

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
                approverOrReceiver: req.receivedBy?.fullName ?? "-",
            });
            continue;
        }
        for (const it of items) {
            rows.push({
                id: req.id,
                status,
                borrowDate,
                returnDue,
                actualReturnDate,
                reason,
                equipmentName: it?.equipment?.name ?? "-",
                // หมายเลขครุภัณฑ์ในตารางผู้ใช้ใช้ "number" (ลำดับ) ไม่ใช่ "code"
                equipmentCode: String(it?.equipment?.number ?? it?.equipmentId ?? "-"),
                approverOrReceiver: req.receivedBy?.fullName ?? "-",
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

    // page/pageSize เผื่ออนาคต (ตอนนี้ UI สองหน้าดึงรวดเดียวได้)
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.max(1, Math.min(200, Number(url.searchParams.get("pageSize") || 200)));

    // ----- เงื่อนไข "รายการของฉัน" -----
    // ภายใน (INTERNAL) แน่นอนว่า requesterId = user.id
    // ภายนอก (EXTERNAL) โปรเจ็กต์ของคุณไม่ได้เก็บ userId ในตารางคำขอ
    // จึงรองรับการ match ตาม requesterId (ถ้ามี) + ชื่อ/เบอร์ (ถ้าคุณบันทึกไว้ใน external*)
    const userId = Number(session.user.id);
    const fullName = String(session.user.fullName ?? session.user.name ?? "");
    const phone = String(session.user.phone ?? "");

    const baseWhere: any = {
        OR: [
            { requesterId: userId }, // ใช้ได้ทั้ง INTERNAL และกรณี EXTERNAL ที่ยังคงผูก requesterId
            // เผื่อระบบคุณบันทึกคำขอภายนอกเป็น external*
            { borrowerType: "EXTERNAL", externalName: fullName || undefined },
            { borrowerType: "EXTERNAL", externalPhone: phone || undefined },
        ],
    };

    // ----- เงื่อนไขสถานะ -----
    if (onlyPending) {
        baseWhere.status = "PENDING";
    } else {
        // ประวัติ = ไม่เอารายการรออนุมัติ
        baseWhere.status = { not: "PENDING" };
    }

    try {
        const [total, list] = await Promise.all([
            prisma.borrowRequest.count({ where: baseWhere }),
            prisma.borrowRequest.findMany({
                where: baseWhere,
                orderBy: { createdAt: "desc" },
                include: {
                    receivedBy: { select: { fullName: true } },
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

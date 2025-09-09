import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const session: any = await auth();
    if (!session) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const meId: number | undefined =
        typeof session.user?.id === "number" ? session.user.id : undefined;
    const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
    const phone = (session.user?.phone || "").trim();
    const fullName = (session.user?.fullName || "").trim();

    // เผื่อกรณี external ไม่มี phone/ชื่อใน session ให้รับจาก query ด้วย (optional)
    const url = new URL(req.url);
    const qpPhone = (url.searchParams.get("phone") || "").trim();
    const qpName = (url.searchParams.get("name") || "").trim();

    const orFilters: any[] = [];

    // ภายใน: ผูกกับ requesterId
    if (meId) {
        orFilters.push({ borrowerType: "INTERNAL", requesterId: meId });
    }

    // ภายนอก: ผูกด้วย externalPhone / externalName (ถ้ามี)
    const phoneKey = phone || qpPhone;
    const nameKey = fullName || qpName;

    if (phoneKey) {
        orFilters.push({ borrowerType: "EXTERNAL", externalPhone: phoneKey });
    }
    if (nameKey) {
        orFilters.push({ borrowerType: "EXTERNAL", externalName: nameKey });
    }

    // ถ้าไม่มีตัวชี้วัดอะไรเลย ก็คืน []

    if (orFilters.length === 0) {
        return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    try {
        const list = await prisma.borrowRequest.findMany({
            where: { OR: orFilters },
            orderBy: [{ createdAt: "desc" }],
            include: {
                requester: {
                    select: { fullName: true, department: { select: { name: true } } },
                },
                approvedBy: { select: { fullName: true } },
                receivedBy: { select: { fullName: true } },
                items: {
                    include: {
                        equipment: {
                            select: { number: true, code: true, name: true },
                        },
                    },
                },
            },
        });

        // คำนวณสถานะ OVERDUE (ถ้ายังไม่คืนและเกินกำหนด)
        const now = new Date();
        const data = list.map((r) => {
            const overdue =
                r.status === "APPROVED" &&
                r.returnDue &&
                new Date(r.returnDue).getTime() < now.getTime() &&
                !r.actualReturnDate;

            return {
                ...r,
                status: overdue ? ("OVERDUE" as const) : r.status,
            };
        });

        return NextResponse.json({ ok: true, data }, { status: 200 });
    } catch (e) {
        console.error("[GET /api/borrow/history/me] error:", e);
        return NextResponse.json({ ok: false, error: "server-error" }, { status: 500 });
    }
}

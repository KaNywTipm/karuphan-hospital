import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const me = session?.user as any;
    const userId = Number(me?.id);
    const role = String(me?.role ?? "");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 }
      );
    }
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้" },
        { status: 403 }
      );
    }

    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { ok: false, error: "รหัสคำขอไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { rejectReason } = await req.json().catch(() => ({}));
    if (!rejectReason || !String(rejectReason).trim()) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" },
        { status: 400 }
      );
    }

    const br = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!br) {
      return NextResponse.json(
        { ok: false, error: "ไม่พบคำขอยืมนี้" },
        { status: 404 }
      );
    }
    if (br.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถไม่อนุมัติคำขอนี้ได้" },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.borrowRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectReason: String(rejectReason).trim(),
          rejectedById: userId, // ← ผู้ไม่อนุมัติ
          rejectedAt: new Date(),
          approvedById: null, // กันข้อมูลค้าง
          approvedAt: null,
        },
        include: {
          requester: {
            select: { id: true, fullName: true, email: true },
          },
          items: {
            include: {
              equipment: {
                select: { name: true, code: true },
              },
            },
          },
          rejectedBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.equipment.updateMany({
        where: { currentRequestId: id },
        data: {
          status: "NORMAL",
          currentRequestId: null,
          statusChangedAt: new Date(),
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[reject]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: any) {
  return PATCH(req, ctx);
}

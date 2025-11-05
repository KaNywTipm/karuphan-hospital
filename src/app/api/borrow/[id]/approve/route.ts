import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: Request,
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

    // ดึงคำขอมาก่อนเพื่อเช็กสถานะ
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
        { ok: false, error: "ไม่สามารถอนุมัติคำขอนี้ได้" },
        { status: 409 }
      );
    }

    // ตรวจของไม่ว่าง
    const eqs = await prisma.equipment.findMany({
      where: { number: { in: br.items.map((i) => i.equipmentId) } },
      select: { number: true, status: true, currentRequestId: true },
    });
    const busy = eqs.filter((e) => e.status === "IN_USE");
    if (busy.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `อุปกรณ์เลข: ${busy
            .map((b) => b.number)
            .join(", ")} กำลังถูกยืม`,
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.borrowRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: userId, // ← ผู้อนุมัติ = แอดมินที่กำลังกด
          approvedAt: now,
          // ใช้ borrowDate ที่ผู้ใช้เลือกไว้แล้ว ไม่ใช่วันที่ปัจจุบัน
          borrowDate: br.borrowDate || now,
        },
        include: {
          requester: { select: { id: true, fullName: true, department: true } },
          items: { include: { equipment: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
      });

      await tx.equipment.updateMany({
        where: { currentRequestId: id },
        data: { status: "IN_USE", statusChangedAt: now },
      });

      return updatedRequest;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    console.error("[approve]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

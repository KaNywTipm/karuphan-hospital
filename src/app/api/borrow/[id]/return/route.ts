import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function coerceReturnCondition(
  input: any
): "NORMAL" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED" {
  const raw = String(input ?? "")
    .trim()
    .toUpperCase();
  if (!raw) return "NORMAL";
  const map: Record<string, string> = {
    NORMAL: "NORMAL",
    ปกติ: "NORMAL",
    OK: "NORMAL",
    "NORMAL ": "NORMAL",
    BROKEN: "BROKEN",
    ชำรุด: "BROKEN",
    เสีย: "BROKEN",
    LOST: "LOST",
    สูญหาย: "LOST",
    หาย: "LOST",
    WAIT_DISPOSE: "WAIT_DISPOSE",
    รอจำหน่าย: "WAIT_DISPOSE",
    DISPOSED: "DISPOSED",
    จำหน่ายแล้ว: "DISPOSED",
  };
  return (map[raw] as any) ?? "NORMAL";
}

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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // รับเป็น array: [{equipmentId, condition}]
    const returnConditions: Array<{ equipmentId: number; condition: string }> =
      Array.isArray(body.returnConditions) ? body.returnConditions : [];
    const returnNotes = body?.returnNotes ? String(body.returnNotes) : null;

    if (!returnConditions.length) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุสภาพครุภัณฑ์ที่คืน" },
        { status: 400 }
      );
    }

    const br = await prisma.borrowRequest.findUnique({
      where: { id },
      include: { items: { select: { id: true, equipmentId: true } } },
    });
    if (!br) {
      return NextResponse.json(
        { ok: false, error: "not-found" },
        { status: 404 }
      );
    }
    if (br.status !== "APPROVED") {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถรับคืนครุภัณฑ์นี้ได้" },
        { status: 409 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const equipmentIds = br.items.map((i) => i.equipmentId);
      if (equipmentIds.length === 0) {
        throw Object.assign(new Error("no-items"), { code: "NO_ITEMS" });
      }

      // 2) อัปเดต BorrowItem.returnCondition แยกแต่ละชิ้น
      for (const item of br.items) {
        const found = returnConditions.find(
          (rc) => rc.equipmentId === item.equipmentId
        );
        if (found) {
          const rc = String(found.condition).toUpperCase();
          const allow = new Set([
            "NORMAL",
            "BROKEN",
            "LOST",
            "WAIT_DISPOSE",
            "DISPOSED",
          ]);
          if (!allow.has(rc)) continue;
          await tx.borrowItem.update({
            where: { id: item.id },
            data: { returnCondition: rc as any },
          });
          // อัปเดตสถานะอุปกรณ์แต่ละชิ้น
          await tx.equipment.update({
            where: { number: item.equipmentId },
            data: {
              status: rc as any,
              currentRequestId: null,
              statusChangedAt: now,
            },
          });
        }
      }

      // 3) อัปเดตคำขอเป็น RETURNED
      const updatedRequest = await tx.borrowRequest.update({
        where: { id },
        data: {
          status: "RETURNED",
          actualReturnDate: now,
          returnNotes: returnNotes,
          receivedById: userId, // ← ผู้รับคืน = แอดมินที่กำลังกด
        },
        include: {
          requester: { select: { fullName: true } },
          receivedBy: { select: { fullName: true } },
          approvedBy: { select: { fullName: true } },
          items: {
            include: {
              equipment: { select: { number: true, code: true, name: true } },
            },
          },
        },
      });

      return updatedRequest;
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    if (e?.code === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "not-found" },
        { status: 404 }
      );
    }
    if (e?.code === "BAD_STATE") {
      return NextResponse.json(
        { ok: false, error: "สถานะคำขอไม่ถูกต้อง" },
        { status: 409 }
      );
    }
    if (e?.code === "NO_ITEMS") {
      return NextResponse.json(
        { ok: false, error: "ไม่มีรายการครุภัณฑ์" },
        { status: 422 }
      );
    }
    console.error("[return]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

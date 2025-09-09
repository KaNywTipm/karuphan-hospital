import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function resolveAdminId(session: any, prisma: any): Promise<number> {
  // Always return user id 1 (user1)
  return 1;
}

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

/**
 * PATCH /api/borrow/:id/return
 * body: { returnCondition: "NORMAL"|"BROKEN"|"LOST"|"WAIT_DISPOSE"|"DISPOSED", returnNotes?: string }
 * เฉพาะ ADMIN
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await auth();
  if (!session)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
  if (role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json(
      { ok: false, error: "invalid-id" },
      { status: 400 }
    );

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 }
    );
  }

  const rc = String(body?.returnCondition ?? "NORMAL").toUpperCase();
  const allow = new Set([
    "NORMAL",
    "BROKEN",
    "LOST",
    "WAIT_DISPOSE",
    "DISPOSED",
  ]);
  if (!allow.has(rc)) {
    return NextResponse.json(
      { ok: false, error: "invalid-return-condition" },
      { status: 400 }
    );
  }
  const returnNotes = body?.returnNotes ? String(body.returnNotes) : null;

  const adminId = await resolveAdminId(session, prisma);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1) ดึงคำขอ + รายการอุปกรณ์ในคำขอ
      const reqRow = await tx.borrowRequest.findUnique({
        where: { id },
        include: {
          items: { select: { equipmentId: true } },
        },
      });
      if (!reqRow)
        throw Object.assign(new Error("not-found"), { code: "NOT_FOUND" });

      // คืนของได้เฉพาะที่อนุมัติอยู่ (หรือ overdue)
      if (reqRow.status !== "APPROVED" && reqRow.status !== "OVERDUE") {
        throw Object.assign(new Error("invalid-state"), { code: "BAD_STATE" });
      }

      const equipmentIds = reqRow.items.map((i) => i.equipmentId);
      if (equipmentIds.length === 0) {
        throw Object.assign(new Error("no-items"), { code: "NO_ITEMS" });
      }

      // 2) อัปเดตคำขอเป็น RETURNED
      const borrow = await tx.borrowRequest.update({
        where: { id },
        data: {
          status: "RETURNED",
          actualReturnDate: new Date(),
          returnCondition: rc as any,
          returnNotes,
          receivedById: adminId,
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

      // 3) เซ็ตสถานะอุปกรณ์กลับตามสภาพคืน + เคลียร์ currentRequestId
      // หมายเหตุ: สคีม่าปัจจุบันเก็บ returnCondition ที่ระดับ "คำขอ" → ทุกชิ้นจะถูกตั้งสถานะเดียวกัน
      const mapRC: any = {
        NORMAL: "NORMAL",
        BROKEN: "BROKEN",
        LOST: "LOST",
        WAIT_DISPOSE: "WAIT_DISPOSE",
        DISPOSED: "DISPOSED",
      };
      await tx.equipment.updateMany({
        where: { currentRequestId: id },
        data: {
          status: mapRC[rc],
          currentRequestId: null,
          statusChangedAt: new Date(),
        },
      });

      // (ถ้าอยากล็อกเพิ่ม ก็บันทึก AuditLog ตรงนี้ได้)

      return borrow;
    });

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (e: any) {
    if (e?.code === "NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "not-found" },
        { status: 404 }
      );
    }
    if (e?.code === "BAD_STATE") {
      return NextResponse.json(
        { ok: false, error: "invalid-state" },
        { status: 409 }
      );
    }
    if (e?.code === "NO_ITEMS") {
      return NextResponse.json(
        { ok: false, error: "no-items" },
        { status: 422 }
      );
    }
    console.error("PATCH /api/borrow/:id/return error:", e);
    return NextResponse.json(
      { ok: false, error: "server-error" },
      { status: 500 }
    );
  }
}

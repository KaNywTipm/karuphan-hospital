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

  // รับเป็น array: [{equipmentId, condition}]
  const returnConditions: Array<{ equipmentId: number; condition: string }> =
    Array.isArray(body.returnConditions) ? body.returnConditions : [];
  const returnNotes = body?.returnNotes ? String(body.returnNotes) : null;
  if (!returnConditions.length) {
    return NextResponse.json(
      { ok: false, error: "missing-return-conditions" },
      { status: 400 }
    );
  }

  const adminId = await resolveAdminId(session, prisma);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1) ดึงคำขอ + รายการอุปกรณ์ในคำขอ
      const reqRow = await tx.borrowRequest.findUnique({
        where: { id },
        include: {
          items: { select: { id: true, equipmentId: true } },
        },
      });
      if (!reqRow)
        throw Object.assign(new Error("not-found"), { code: "NOT_FOUND" });

      // คืนของได้เฉพาะที่อนุมัติอยู่ (หรือ overdue พัฒนาในอนาคต)

      const equipmentIds = reqRow.items.map((i) => i.equipmentId);
      if (equipmentIds.length === 0) {
        throw Object.assign(new Error("no-items"), { code: "NO_ITEMS" });
      }

      // 2) อัปเดต BorrowItem.returnCondition แยกแต่ละชิ้น
      for (const item of reqRow.items) {
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
              statusChangedAt: new Date(),
            },
          });
        }
      }

      // 3) อัปเดตคำขอเป็น RETURNED (ไม่ต้องเซ็ต returnCondition ที่ borrowRequest แล้ว)
      const borrow = await tx.borrowRequest.update({
        where: { id },
        data: {
          status: "RETURNED",
          actualReturnDate: new Date(),
          returnNotes: body?.returnNotes ?? null,
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

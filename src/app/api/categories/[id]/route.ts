import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helpers
async function requireAdmin() {
  const session: any = await auth();
  if (!session) {
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 }
      ),
    };
  }
  const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
  if (role !== "ADMIN") {
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, error: "คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, session };
}

function parseId(params: { id?: string }) {
  const id = Number(params?.id);
  if (!Number.isFinite(id))
    return {
      ok: false as const,
      error: NextResponse.json(
        { ok: false, error: "รหัสหมวดหมู่ไม่ถูกต้อง" },
        { status: 400 }
      ),
    };
  return { ok: true as const, id };
}

// PATCH /api/categories/:id
// body: { name: string; description?: string | null }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  const idParsed = parseId(params);
  if (!idParsed.ok) return idParsed.error;
  const id = idParsed.id;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const nameRaw = String(payload?.name ?? "").trim();
  const description =
    payload?.description == null ? null : String(payload.description).trim();

  if (!nameRaw) {
    return NextResponse.json(
      { ok: false, error: "กรุณากรอกชื่อหมวดหมู่" },
      { status: 400 }
    );
  }

  try {
    // มี isActive อยู่หรือไม่แล้วแต่ schema; ถ้ามีให้คงไว้ (ไม่บังคับ)
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: nameRaw,
        description,
      },
    });

    return NextResponse.json({ ok: true, id, data: updated }, { status: 200 });
  } catch (e: any) {
    // not found
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "ไม่พบหมวดหมู่นี้" },
        { status: 404 }
      );
    }
    // unique conflict (เช่นชื่อซ้ำ)
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว" },
        { status: 409 }
      );
    }
    console.error("PATCH /api/categories/:id error:", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/:id
// ?hard=1 -> ลบจริง (ยอมเมื่อไม่มีอุปกรณ์อ้างถึงเท่านั้น)
// ไม่ส่ง -> soft delete โดย set isActive=false (ถ้ามีฟิลด์นี้ใน schema)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  const idParsed = parseId(params);
  if (!idParsed.ok) return idParsed.error;
  const id = idParsed.id;

  const hard = new URL(req.url).searchParams.get("hard") === "1";

  try {
    // เช็คว่ามีจริงก่อน
    await prisma.category.findUniqueOrThrow({ where: { id } });

    // กันการลบถ้ามีอุปกรณ์อ้างถึง
    const equipmentCount = await prisma.equipment.count({
      where: { categoryId: id },
    });
    if (equipmentCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "มีรายการครุภัณฑ์ใช้งานอยู่",
          detail: { equipmentCount },
        },
        { status: 409 }
      );
    }

    if (!hard) {
      // Soft delete (ถ้า schema ไม่มี isActive ให้เปลี่ยนมาใช้ delete แทน)
      try {
        await prisma.category.update({
          where: { id },
          data: { isActive: false as any },
        });
        return NextResponse.json(
          { ok: true, id, hard: false },
          { status: 200 }
        );
      } catch {
        // กรณีไม่มีฟิลด์ isActive ให้ fallback เป็น hard delete
        await prisma.category.delete({ where: { id } });
        return NextResponse.json({ ok: true, id, hard: true }, { status: 200 });
      }
    }

    // Hard delete
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true, id, hard: true }, { status: 200 });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "ไม่พบหมวดหมู่นี้" },
        { status: 404 }
      );
    }
    if (e?.code === "P2003" || /Foreign key/i.test(e?.message ?? "")) {
      const equipmentCount =
        (await prisma.equipment
          .count({ where: { categoryId: id } })
          .catch(() => undefined)) ?? undefined;
      return NextResponse.json(
        {
          ok: false,
          error: "มีรายการครุภัณฑ์ใช้งานอยู่",
          detail: { equipmentCount },
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/categories/:id error:", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

// OPTIONS (เผื่อมี preflight)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

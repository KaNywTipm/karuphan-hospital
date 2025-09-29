import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function toInt(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error("invalid-id");
  return Math.floor(n);
}

async function requireAdmin() {
  const session: any = await auth();
  if (!session)
    throw NextResponse.json(
      { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" },
      { status: 401 }
    );
  const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
  if (role !== "ADMIN")
    throw NextResponse.json(
      { ok: false, error: "คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้" },
      { status: 403 }
    );
  return session;
}

/** -------- GET /api/users/:id (optional) -------- */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = toInt(params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        department: { select: { id: true, name: true } },
      },
    });
    if (!user)
      return NextResponse.json(
        { ok: false, error: "ไม่พบผู้ใช้งานนี้" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    if (e?.status) return e; // forwarded NextResponse
    return NextResponse.json(
      { ok: false, error: e?.message ?? "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

/** -------- PATCH /api/users/:id (อัปเดต) -------- */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = toInt(params.id);
    const body = await req.json().catch(() => ({}));

    const data: any = {};
    if (typeof body.fullName === "string") data.fullName = body.fullName.trim();
    if (typeof body.phone === "string" || body.phone === null)
      data.phone = body.phone ?? null;
    if (typeof body.role === "string")
      data.role = String(body.role).toUpperCase();
    if (body.departmentId === null) data.department = { disconnect: true };
    else if (Number.isFinite(Number(body.departmentId)))
      data.department = { connect: { id: Number(body.departmentId) } };

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    if (e?.status) return e;
    if (e?.code === "P2025")
      return NextResponse.json(
        { ok: false, error: "ไม่พบผู้ใช้งานนี้" },
        { status: 404 }
      );
    return NextResponse.json(
      { ok: false, error: "server-error" },
      { status: 500 }
    );
  }
}

/** -------- DELETE /api/users/:id (ลบ) -------- */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session: any = await requireAdmin();
    const id = toInt(params.id);

    // กันลบตัวเอง (ถ้าไม่ต้องการลอจิกนี้ ลบ if นี้ออกได้)
    const meId = Number(session.user?.id ?? session.id);
    if (Number.isFinite(meId) && meId === id) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถลบบัญชีตนเองได้" },
        { status: 409 }
      );
    }

    // ตรวจสอบการยืมที่ยังไม่เสร็จสิ้น
    const activeBorrows = await prisma.borrowRequest.count({
      where: {
        requesterId: id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (activeBorrows > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `ไม่สามารถลบผู้ใช้ได้ เนื่องจากมีการยืมครุภัณฑ์ที่ยังไม่เสร็จสิ้น ${activeBorrows} รายการ`,
        },
        { status: 409 }
      );
    }

    const deleted = await prisma.user.delete({
      where: { id },
      select: { id: true, fullName: true, email: true },
    });

    return NextResponse.json({ ok: true, user: deleted });
  } catch (e: any) {
    if (e?.status) return e;
    // ความสัมพันธ์อ้างอิงอยู่ (เช่น เคยยืมของ ฯลฯ)
    if (e?.code === "P2003") {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถลบผู้ใช้งานที่มีประวัติการใช้งาน" },
        { status: 409 }
      );
    }
    // ไม่พบ
    if (e?.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: "ไม่พบผู้ใช้งานนี้" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "server-error" },
      { status: 500 }
    );
  }
}

// (ถ้าclientมี preflight) จะไม่ 405
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

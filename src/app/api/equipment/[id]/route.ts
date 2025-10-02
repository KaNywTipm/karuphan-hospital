import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "NORMAL",
  "RESERVED", // เพิ่มสถานะใหม่
  "IN_USE",
  "BROKEN",
  "LOST",
  "WAIT_DISPOSE",
  "DISPOSED",
]);

/** ---------- GET /api/equipment/:id (อ่านทีละตัว) ---------- */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid-id" },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.equipment.findUnique({
      where: { number: id },
      select: {
        number: true,
        code: true,
        idnum: true,
        name: true,
        description: true,
        status: true,
        statusNote: true,
        receivedDate: true,
        price: true,
        currentRequestId: true,
        category: { select: { id: true, name: true } },
      },
    });
    if (!row)
      return NextResponse.json(
        { ok: false, error: "ไม่พบครุภัณฑ์นี้" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, data: row });
  } catch (e: any) {
    console.error("[GET /api/equipment/:id]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

/** ---------- PATCH /api/equipment/:id (แก้ไข) ---------- */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await auth();
  if (!session)
    return NextResponse.json(
      { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" },
      { status: 401 }
    );
  const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
  if (role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้" },
      { status: 403 }
    );

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { ok: false, error: "invalid-id" },
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

  // ดึงของเดิมมาก่อนเพื่อเช็กเงื่อนไขการเปลี่ยนสถานะ
  const current = await prisma.equipment.findUnique({
    where: { number: id },
    select: {
      number: true,
      status: true,
      currentRequestId: true,
      currentRequest: {
        select: {
          id: true,
          status: true,
          borrowerType: true,
          requester: { select: { fullName: true } },
          externalName: true,
        },
      },
    },
  });
  if (!current)
    return NextResponse.json(
      { ok: false, error: "ไม่พบครุภัณฑ์นี้" },
      { status: 404 }
    );

  // ตรวจสอบว่ามีคำขอค้างอยู่หรือไม่
  if (current.currentRequestId && current.currentRequest) {
    const activeRequest = current.currentRequest;
    const requesterName =
      activeRequest.borrowerType === "INTERNAL"
        ? activeRequest.requester?.fullName
        : activeRequest.externalName;

    return NextResponse.json(
      {
        ok: false,
        error: `ไม่สามารถแก้ไขครุภัณฑ์ได้ เนื่องจากมีคำขอ ${
          activeRequest.status === "PENDING" ? "รอการอนุมัติ" : "กำลังดำเนินการ"
        } โดย ${requesterName || "ผู้ใช้"} (คำขอ #${
          activeRequest.id
        }) กรุณาดำเนินการให้เสร็จสิ้นก่อน`,
      },
      { status: 409 }
    );
  }

  const updates: any = {};
  if (body.code != null) updates.code = String(body.code).trim();
  if (body.name != null) updates.name = String(body.name).trim();
  if (body.description != null)
    updates.description = String(body.description).trim();
  if (body.idnum != null) updates.idnum = String(body.idnum).trim();
  if (body.categoryId != null) updates.categoryId = Number(body.categoryId);
  if (body.receivedDate != null)
    updates.receivedDate = new Date(body.receivedDate);
  if (body.price != null && String(body.price).trim() !== "")
    updates.price = String(body.price); // Decimal
  if (body.statusNote != null) updates.statusNote = String(body.statusNote);

  // การแก้ไขสถานะ: กัน IN_USE และ RESERVED ให้จัดการผ่านฟลว์ borrow เท่านั้น
  if (body.status != null) {
    const newStatus = String(body.status).toUpperCase();
    if (!ALLOWED_STATUS.has(newStatus)) {
      return NextResponse.json(
        { ok: false, error: "สถานะที่เลือกไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ห้ามเซ็ตเป็น IN_USE หรือ RESERVED ด้วยมือ
    if (newStatus === "IN_USE" || newStatus === "RESERVED") {
      return NextResponse.json(
        {
          ok: false,
          error: "ไม่สามารถตั้งสถานะเป็น 'กำลังใช้งาน' หรือ 'จอง' ด้วยตนเองได้",
        },
        { status: 409 }
      );
    }

    // ห้ามเปลี่ยนสถานะจาก IN_USE หรือ RESERVED เป็นอย่างอื่น จนกว่าจะตรวจสภาพตามคำขอ
    if (current.status === "IN_USE" || current.status === "RESERVED") {
      return NextResponse.json(
        {
          ok: false,
          error: `ไม่สามารถเปลี่ยนสถานะของครุภัณฑ์ที่กำลัง${
            current.status === "IN_USE" ? "ใช้งาน" : "รออนุมัติ"
          }อยู่ได้ กรุณาตรวจสภาพตามคำขอก่อน`,
        },
        { status: 409 }
      );
    }

    updates.status = newStatus as any;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "ไม่มีข้อมูลที่ต้องปรับปรุง" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.equipment.update({
      where: { number: id },
      data: updates,
      select: {
        number: true,
        code: true,
        idnum: true,
        name: true,
        description: true,
        status: true,
        statusNote: true,
        receivedDate: true,
        price: true,
        currentRequestId: true,
        category: { select: { id: true, name: true } },
      },
    });
    // แปลง receivedDate เป็นวันเดือนปีไทยก่อนส่งกลับ
    const thReceivedDate = updated.receivedDate
      ? new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(updated.receivedDate))
      : null;
    return NextResponse.json({
      ok: true,
      data: { ...updated, receivedDate: thReceivedDate },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique ซ้ำ (code / [categoryId,idnum])
      return NextResponse.json(
        { ok: false, error: "เลขครุภัณฑ์นี้มีอยู่ในระบบแล้ว" },
        { status: 409 }
      );
    }
    if (e?.code === "P2003") {
      // FK ไม่ถูกต้อง เช่น categoryId ไม่มี
      return NextResponse.json(
        { ok: false, error: "หมวดหมู่ที่เลือกไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    console.error("[PATCH /api/equipment/:id]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" },
      { status: 500 }
    );
  }
}

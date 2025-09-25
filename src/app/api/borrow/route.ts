import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Config / helpers
const ALLOWED_STATUS = new Set(["PENDING", "APPROVED", "RETURNED", "REJECTED"]);
const ALLOWED_BORROWER = new Set(["INTERNAL", "EXTERNAL"]);

function pickStatus(v: string | null | undefined) {
  if (!v) return undefined;
  const s = v.toUpperCase();
  return ALLOWED_STATUS.has(s) ? (s as any) : undefined;
}
function pickBorrower(v: string | null | undefined) {
  if (!v) return undefined;
  const s = v.toUpperCase();
  return ALLOWED_BORROWER.has(s) ? (s as any) : undefined;
}

// GET /api/borrow
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;

    // filter / paging
    const status = pickStatus(sp.get("status")) || undefined;
    const page = Math.max(1, Number(sp.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(sp.get("pageSize") || "20"))
    );

    const where: any = {};
    if (status) where.status = status;

    const [total, rows] = await prisma.$transaction([
      prisma.borrowRequest.count({ where }),
      prisma.borrowRequest.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          status: true,
          borrowerType: true,
          borrowDate: true,
          returnDue: true,
          actualReturnDate: true,
          reason: true,
          returnNotes: true,
          rejectReason: true,
          rejectedAt: true,

          externalName: true,
          externalDept: true,
          externalPhone: true,

          requester: {
            select: {
              id: true,
              fullName: true,
              department: { select: { name: true } },
            },
          },
          approvedBy: { select: { id: true, fullName: true } },
          receivedBy: { select: { id: true, fullName: true } },
          rejectedBy: { select: { id: true, fullName: true } },

          items: {
            include: {
              equipment: {
                select: {
                  number: true,
                  code: true,
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // คำนวณ flag "เกินกำหนด" แต่ไม่แก้ status
    const now = Date.now();
    const data = rows.map((r) => {
      const isOverdue =
        r.status === "APPROVED" &&
        r.returnDue &&
        new Date(r.returnDue).getTime() < now &&
        !r.actualReturnDate;
      return { ...r, isOverdue };
    });

    return NextResponse.json(
      { ok: true, page, pageSize, total, data },
      { status: 200 }
    );
  } catch (e) {
    console.error("[GET /api/borrow] error:", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการโหลดข้อมูลการยืม" },
      { status: 500 }
    );
  }
}

type PostBody = {
  borrowerType: "INTERNAL" | "EXTERNAL";
  borrowDate: string | Date; // เพิ่มฟิลด์วันที่ยืม
  returnDue: string | Date;
  reason?: string | null;
  notes?: string | null;
  externalName?: string | null;
  externalDept?: string | null;
  externalPhone?: string | null;
  items: { equipmentId: number; quantity?: number }[]; // equipmentId ต้องเป็น Equipment.number
};

// POST /api/borrow
export async function POST(req: Request) {
  try {
    const me = await auth();
    if (!me)
      return NextResponse.json(
        { ok: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
        { status: 401 }
      );

    let body: PostBody;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const {
      borrowerType,
      borrowDate,
      returnDue,
      reason,
      items,
      externalName,
      externalDept,
      externalPhone,
    } = body;

    if (!items?.length)
      return NextResponse.json(
        { ok: false, error: "กรุณาเลือกครุภัณฑ์ที่ต้องการยืม" },
        { status: 400 }
      );

    // Validation วันที่ยืม
    if (!borrowDate) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุวันที่ยืม" },
        { status: 400 }
      );
    }

    // Validation วันที่คืน
    if (!returnDue) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุวันที่คืน" },
        { status: 400 }
      );
    }

    // ตรวจสอบความถูกต้องของวันที่
    let borrowDateObj: Date;
    let returnDueObj: Date;

    try {
      borrowDateObj = new Date(borrowDate);
      returnDueObj = new Date(returnDue);

      // ตรวจสอบว่าเป็น valid date
      if (isNaN(borrowDateObj.getTime()) || isNaN(returnDueObj.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: "รูปแบบวันที่ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าวันที่ยืมไม่เป็นอดีต
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const borrowDateCheck = new Date(borrowDateObj);
    borrowDateCheck.setHours(0, 0, 0, 0);

    if (borrowDateCheck < today) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถเลือกวันที่ยืมในอดีตได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าวันที่คืนต้องมาหลังวันที่ยืม
    if (returnDueObj <= borrowDateObj) {
      return NextResponse.json(
        { ok: false, error: "วันที่คืนต้องมาหลังวันที่ยืม" },
        { status: 400 }
      );
    }

    const isInternal = borrowerType === "INTERNAL";
    const isExternal = borrowerType === "EXTERNAL";

    //  requesterId ผูกกับผู้ที่ล็อกอินเสมอ (ทั้ง INTERNAL/EXTERNAL)
    const requesterId =
      typeof me.user?.id === "number"
        ? me.user.id
        : Number(me.user?.id) || null;

    if (!requesterId) {
      return NextResponse.json(
        { ok: false, error: "ไม่สามารถระบุตัวตนผู้ใช้ได้" },
        { status: 401 }
      );
    }

    // เก็บข้อมูลผู้ยืมภายนอก และ validate สำหรับ EXTERNAL
    let finalExternalName = null,
      finalExternalDept = null,
      finalExternalPhone = null;
    if (isExternal) {
      finalExternalName = externalName?.trim() || null;
      finalExternalDept = externalDept?.trim() || null;
      finalExternalPhone = externalPhone?.trim() || null;

      // Validate: EXTERNAL ต้องมี externalDept
      if (!finalExternalDept) {
        return NextResponse.json(
          {
            ok: false,
            error: "กรุณาระบุชื่อหน่วยงานสำหรับผู้ยืมภายนอก",
          },
          { status: 400 }
        );
      }
    }

    const adminId = 1;

    // ตรวจสอบความถูกต้องของ equipmentId ก่อนสร้าง transaction
    const equipmentNumbers = items
      .map((it: any) => it.equipmentId)
      .filter(Boolean);
    if (equipmentNumbers.length !== items.length) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุครุภัณฑ์ที่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าครุภัณฑ์ที่ระบุมีอยู่จริงในระบบ
    const existingEquipment = await prisma.equipment.findMany({
      where: { number: { in: equipmentNumbers } },
      select: { number: true },
    });

    if (existingEquipment.length !== equipmentNumbers.length) {
      const missingEquipment = equipmentNumbers.filter(
        (num) => !existingEquipment.some((eq) => eq.number === num)
      );
      return NextResponse.json(
        {
          ok: false,
          error: `ไม่พบครุภัณฑ์หมายเลข: ${missingEquipment.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      try {
        const reqRow = await tx.borrowRequest.create({
          data: {
            borrowerType,
            requesterId, // ผูกผู้ร้องขอ
            externalName: finalExternalName,
            externalDept: finalExternalDept,
            externalPhone: finalExternalPhone,
            status: isInternal ? "APPROVED" : "PENDING",
            borrowDate: borrowDateObj, // ใช้ Date object ที่ validate แล้ว
            returnDue: returnDueObj, // ใช้ Date object ที่ validate แล้ว
            reason: reason ?? null,
            items: {
              create: items.map((it: any) => ({
                equipmentId: it.equipmentId, // ใช้ equipment.number
                quantity: it.quantity ?? 1,
              })),
            },
            approvedById: isInternal ? adminId : null,
            receivedById: isInternal ? adminId : null,
            approvedAt: isInternal ? new Date() : null,
          },
          include: { items: true },
        });

        // อัพเดทสถานะครุภัณฑ์
        await tx.equipment.updateMany({
          where: {
            number: { in: reqRow.items.map((i: any) => i.equipmentId) },
          },
          data: {
            status: isExternal ? "RESERVED" : "IN_USE",
            currentRequestId: reqRow.id,
            statusChangedAt: new Date(),
          },
        });

        return reqRow;
      } catch (error) {
        console.error("[POST /api/borrow] Transaction error:", error);
        throw error;
      }
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/borrow] error:", e);

    // ตรวจสอบ Prisma errors
    if (e && typeof e === "object" && "code" in e) {
      switch (e.code) {
        case "P2002":
          return NextResponse.json(
            { ok: false, error: "ข้อมูลซ้ำ โปรดตรวจสอบข้อมูลที่ส่ง" },
            { status: 400 }
          );
        case "P2003":
          return NextResponse.json(
            {
              ok: false,
              error: "ข้อมูลอ้างอิงไม่ถูกต้อง โปรดตรวจสอบครุภัณฑ์หรือผู้ใช้",
            },
            { status: 400 }
          );
        case "P2025":
          return NextResponse.json(
            { ok: false, error: "ไม่พบข้อมูลที่ต้องการ" },
            { status: 404 }
          );
        default:
          break;
      }
    }

    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดในการสร้างคำขอยืม" },
      { status: 500 }
    );
  }
}

// CORS preflight (ถ้าใช้)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

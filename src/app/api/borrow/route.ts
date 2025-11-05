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

/**
 * ฟังก์ชันตรวจสอบและปรับสถานะคำขอยืมภายนอกที่เกิน 3 วันโดยอัตโนมัติ
 */
async function autoRejectExpiredExternalRequests() {
  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // ค้นหาคำขอยืมภายนอกที่เกิน 3 วันแล้ว
    const expiredRequests = await prisma.borrowRequest.findMany({
      where: {
        borrowerType: "EXTERNAL",
        status: "PENDING",
        createdAt: {
          lt: threeDaysAgo,
        },
      },
      select: { id: true },
    });

    if (expiredRequests.length > 0) {
      // ปรับสถานะเป็น REJECTED พร้อมทั้งปล่อยอุปกรณ์
      await prisma.$transaction(async (tx) => {
        // อัปเดตสถานะคำขอ
        await tx.borrowRequest.updateMany({
          where: {
            id: { in: expiredRequests.map((r) => r.id) },
          },
          data: {
            status: "REJECTED",
            rejectedAt: now,
            rejectReason: "คำขอหมดอายุ - ไม่ได้รับการอนุมัติภายใน 3 วัน",
          },
        });

        // ปล่อยอุปกรณ์ที่ถูก reserve
        await tx.equipment.updateMany({
          where: {
            currentRequestId: { in: expiredRequests.map((r) => r.id) },
          },
          data: {
            status: "NORMAL",
            currentRequestId: null,
            statusChangedAt: now,
          },
        });
      });

      console.log(
        `Auto-rejected ${expiredRequests.length} expired external requests`
      );
    }
  } catch (error) {
    console.error("Error in autoRejectExpiredExternalRequests:", error);
    // ไม่ throw error เพื่อไม่ให้กระทบต่อการทำงานหลัก
  }
}

// GET /api/borrow
export async function GET(req: Request) {
  try {
    // ตรวจสอบและปรับสถานะคำขอยืมภายนอกที่เกิน 3 วันอัตโนมัติ
    await autoRejectExpiredExternalRequests();

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
  borrowDate?: string | Date;
  returnDue?: string | Date;
  reason?: string | null;
  notes?: string | null;
  externalName?: string | null;
  externalDept?: string | null;
  externalPhone?: string | null;
  items: AnyItem[];
};

type AnyItem =
  | number
  | string
  | {
      equipmentId?: number | string;
      id?: number | string;
      number?: number | string;
      quantity?: number;
    };

function readEquipNumber(x: AnyItem): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string") return Number(x);
  const raw = x.equipmentId ?? x.id ?? x.number;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// POST /api/borrow
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const borrowerType = String(body?.borrowerType || "").toUpperCase(); // INTERNAL | EXTERNAL
    const rawItems: AnyItem[] = Array.isArray(body?.items) ? body.items : [];

    // 1) validate items
    const equipmentNumbers = Array.from(
      new Set(
        rawItems.map(readEquipNumber).filter((n): n is number => n !== null)
      )
    );
    if (!equipmentNumbers.length) {
      return NextResponse.json(
        { ok: false, error: "กรุณาเลือกครุภัณฑ์ที่ต้องการยืม" },
        { status: 400 }
      );
    }

    // 2) parse returnDue (optional)
    let returnDue: Date | null = null;
    if (body?.returnDue) {
      const d = new Date(body.returnDue);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { ok: false, error: "วันที่คืนครุภัณฑ์ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      returnDue = d;
    }

    // 3) parse borrowDate (optional)
    let borrowDate: Date | null = null;
    if (body?.borrowDate) {
      const d = new Date(body.borrowDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { ok: false, error: "วันที่ยืมครุภัณฑ์ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      borrowDate = d;
    }

    // 4) auth for INTERNAL
    const session = await auth();
    const me = session?.user as any;
    const isInternal = borrowerType === "INTERNAL";
    const requesterId = isInternal ? Number(me?.id) : null;
    if (isInternal && !Number.isFinite(requesterId)) {
      return NextResponse.json(
        { ok: false, error: "กรุณาเข้าสู่ระบบก่อนทำการยืม" },
        { status: 401 }
      );
    }

    // 5) fetch equipments in one go
    const eqs = await prisma.equipment.findMany({
      where: { number: { in: equipmentNumbers } },
      select: { number: true, status: true, name: true },
    });

    const foundNumbers = new Set(eqs.map((e) => e.number));
    const notFound = equipmentNumbers.filter((n) => !foundNumbers.has(n));
    const unavailable = eqs
      .filter((e) => e.status !== "NORMAL")
      .map((e) => e.number);

    if (notFound.length || unavailable.length) {
      // แจ้งให้รู้ว่าตัวไหนผิด
      return NextResponse.json(
        {
          ok: false,
          error: "ครุภัณฑ์ที่เลือกไม่ถูกต้องหรือไม่พร้อมใช้งาน",
          details: { notFound, unavailable },
        },
        { status: 409 }
      );
    }

    const now = new Date();

    // 6) transaction
    const created = await prisma.$transaction(async (tx) => {
      // สร้าง data object สำหรับ BorrowRequest
      const borrowRequestData: any = {
        borrowerType: borrowerType as any,
        status: (isInternal ? "APPROVED" : "PENDING") as any,
        requesterId: isInternal ? requesterId : null,
        externalName: isInternal ? null : String(body?.externalName || ""),
        externalDept: isInternal ? null : String(body?.externalDept || ""),
        externalPhone: isInternal ? null : String(body?.externalPhone || ""),
        reason: body?.reason ?? null,
        notes: body?.notes ?? null,
        borrowDate: borrowDate || (isInternal ? now : null),
        approvedAt: isInternal ? now : null,
        approvedById: isInternal ? requesterId : null,

        // ห้ามตั้ง receivedById/actualReturnDate ตอนนี้
        rejectedById: null,
        rejectedAt: null,
        receivedById: null,
        actualReturnDate: null,

        items: {
          create: equipmentNumbers.map((equipNum) => {
            // หา quantity จาก rawItems
            const originalItem = rawItems.find((item) => {
              const num = readEquipNumber(item);
              return num === equipNum;
            });
            const quantity =
              typeof originalItem === "object" && originalItem !== null
                ? originalItem.quantity || 1
                : 1;

            return {
              equipmentId: equipNum, // ใช้ equipment.number ตาม schema
              quantity,
            };
          }),
        },
      };

      // เพิ่ม returnDue ถ้ามี
      if (returnDue) {
        borrowRequestData.returnDue = returnDue;
      }

      const br = await tx.borrowRequest.create({
        data: borrowRequestData,
        include: { items: { include: { equipment: true } } },
      });

      if (isInternal) {
        // INTERNAL: เปลี่ยนเป็น IN_USE ทันที
        await tx.equipment.updateMany({
          where: { number: { in: equipmentNumbers } },
          data: {
            status: "IN_USE" as any,
            currentRequestId: br.id,
            statusChangedAt: now,
          },
        });
      } else {
        // EXTERNAL: เปลี่ยนเป็น RESERVED (รอการอนุมัติ)
        await tx.equipment.updateMany({
          where: { number: { in: equipmentNumbers } },
          data: {
            status: "RESERVED" as any,
            currentRequestId: br.id,
            statusChangedAt: now,
          },
        });
      }

      return br;
    });

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/borrow] error:", e?.message || e);

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
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

// CORS preflight (ถ้าใช้)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

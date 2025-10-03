import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/borrow/auto-reject
 * ตรวจสอบคำขอยืมภายนอก (EXTERNAL) ที่ส่งมาแล้วเกิน 3 วัน แต่ยังไม่ได้อนุมัติ
 * และปรับสถานะเป็น REJECTED โดยอัตโนมัติ
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    const me = session?.user as any;
    const userId = Number(me?.id);
    const role = String(me?.role ?? "");

    // ตรวจสอบสิทธิ์ - อนุญาตเฉพาะ ADMIN เท่านั้น
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

    const now = new Date();
    // คำนวณวันที่ 3 วันที่แล้ว
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // ค้นหาคำขอยืมภายนอกที่:
    // 1. borrowerType = EXTERNAL
    // 2. status = PENDING
    // 3. createdAt < threeDaysAgo (ส่งมาเกิน 3 วันแล้ว)
    const expiredRequests = await prisma.borrowRequest.findMany({
      where: {
        borrowerType: "EXTERNAL",
        status: "PENDING",
        createdAt: {
          lt: threeDaysAgo,
        },
      },
      include: {
        items: {
          include: {
            equipment: {
              select: { number: true, code: true, name: true },
            },
          },
        },
      },
    });

    if (expiredRequests.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "ไม่พบคำขอยืมที่เกินกำหนด",
        processed: 0,
        data: [],
      });
    }

    // ปรับสถานะเป็น REJECTED สำหรับคำขอที่เกินกำหนด
    const rejectedRequests = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const request of expiredRequests) {
        // อัปเดตสถานะคำขอ
        const updated = await tx.borrowRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED",
            rejectedById: userId, // แอดมินที่รันคำสั่งนี้
            rejectedAt: now,
            rejectReason: "คำขอหมดอายุ - ไม่ได้รับการอนุมัติภายใน 3 วัน",
          },
          include: {
            items: {
              include: {
                equipment: {
                  select: { number: true, code: true, name: true },
                },
              },
            },
          },
        });

        // อัปเดตสถานะอุปกรณ์ที่เคยถูก reserve ให้กลับเป็น NORMAL
        await tx.equipment.updateMany({
          where: {
            currentRequestId: request.id,
          },
          data: {
            status: "NORMAL",
            currentRequestId: null,
            statusChangedAt: now,
          },
        });

        results.push({
          id: updated.id,
          externalName: request.externalName,
          externalDept: request.externalDept,
          createdAt: request.createdAt,
          itemCount: request.items.length,
          items: request.items.map((item) => ({
            equipmentCode: item.equipment.code,
            equipmentName: item.equipment.name,
          })),
        });
      }

      return results;
    });

    return NextResponse.json({
      ok: true,
      message: `ปรับสถานะคำขอที่เกินกำหนดเรียบร้อยแล้ว จำนวน ${rejectedRequests.length} รายการ`,
      processed: rejectedRequests.length,
      data: rejectedRequests,
    });
  } catch (e: any) {
    console.error("[auto-reject]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/borrow/auto-reject
 * ดูคำขอยืมภายนอกที่เกิน 3 วันแต่ยังไม่ได้อนุมัติ (สำหรับดูก่อนจะรัน auto-reject)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const me = session?.user as any;
    const role = String(me?.role ?? "");

    // ตรวจสอบสิทธิ์ - อนุญาตเฉพาะ ADMIN เท่านั้น
    if (role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "คุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้" },
        { status: 403 }
      );
    }

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
      include: {
        items: {
          include: {
            equipment: {
              select: { number: true, code: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const results = expiredRequests.map((request) => ({
      id: request.id,
      externalName: request.externalName,
      externalDept: request.externalDept,
      externalPhone: request.externalPhone,
      createdAt: request.createdAt,
      daysOverdue: Math.floor(
        (now.getTime() - new Date(request.createdAt).getTime()) /
          (24 * 60 * 60 * 1000)
      ),
      itemCount: request.items.length,
      items: request.items.map((item) => ({
        equipmentCode: item.equipment.code,
        equipmentName: item.equipment.name,
        quantity: item.quantity,
      })),
    }));

    return NextResponse.json({
      ok: true,
      count: results.length,
      data: results,
    });
  } catch (e: any) {
    console.error("[get auto-reject candidates]", e);
    return NextResponse.json(
      { ok: false, error: "เกิดข้อผิดพลาดภายในระบบ" },
      { status: 500 }
    );
  }
}

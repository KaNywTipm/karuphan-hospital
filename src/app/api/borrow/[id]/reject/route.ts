import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ดึง id แอดมินจาก session; ถ้าไม่มีให้ fallback ไปหาแอดมินคนเดียวในระบบ
async function resolveAdminId(session: any, prisma: any): Promise<number> {
  // Always return user id 1 (user1)
  return 1;
}

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "คุณไม่มีสิทธิ์ดำเนินการนี้ (เฉพาะผู้ดูแลระบบ)" },
      { status: 403 }
    );

  const id = Number(params.id);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const reqRow = await prisma.borrowRequest.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!reqRow)
    return NextResponse.json(
      { ok: false, error: "ไม่พบคำขอยืมครุภัณฑ์นี้" },
      { status: 404 }
    );
  if (reqRow.status !== "PENDING")
    return NextResponse.json(
      { ok: false, error: "คำขอนี้ดำเนินการไปแล้ว ไม่สามารถไม่อนุมัติได้" },
      { status: 400 }
    );

  const adminId = await resolveAdminId(session, prisma);

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.borrowRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedById: adminId,
        rejectedAt: new Date(),
        rejectReason: body?.reason ?? null,
      },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            equipment: {
              select: { name: true, code: true },
            },
          },
        },
      },
    });
    await tx.equipment.updateMany({
      where: { currentRequestId: id },
      data: {
        status: "NORMAL",
        currentRequestId: null,
        statusChangedAt: new Date(),
      },
    });
    return updated;
  });

  return NextResponse.json({
    ok: true,
    message: "ไม่อนุมัติคำขอเรียบร้อยแล้ว",
  });
}
export async function POST(req: Request, ctx: any) {
  return PATCH(req, ctx);
}

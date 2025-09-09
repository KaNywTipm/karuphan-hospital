import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);

  // ค้นหาชื่อกลุ่มงาน
  const q = (url.searchParams.get("q") ?? "").trim();

  // includeInactive=1|true|all => รวมกลุ่มงานที่ปิดใช้งานด้วย (กรณี soft delete)
  const includeInactive = ["1", "true", "all"].includes(
    (url.searchParams.get("includeInactive") ?? "").toLowerCase()
  );

  // withCount=1|true => ส่งจำนวนผู้ใช้ในแต่ละกลุ่มมาด้วย (ไม่ได้ใช้กรอง แค่แสดงผล)
  const withCount = ["1", "true"].includes(
    (url.searchParams.get("withCount") ?? "").toLowerCase()
  );

  // เผื่ออยากแบ่งหน้า
  const take = Math.min(Number(url.searchParams.get("take") ?? 1000) || 1000, 5000);
  const skip = Math.max(Number(url.searchParams.get("skip") ?? 0) || 0, 0);

  const where: any = {};
  if (!includeInactive) where.isActive = true;      // มีฟิลด์ isActive จาก schema ใหม่
  if (q) where.name = { contains: q, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        ...(withCount ? { _count: { select: { users: true } } } : {}),
      },
    }),
    prisma.department.count({ where }),
  ]);

  return NextResponse.json({ ok: true, items: rows, total });
}

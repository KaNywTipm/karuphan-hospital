import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// อย่าใช้ runtime = "edge" เพราะ Prisma ใช้ได้ดีสุดกับ Node.js runtime
export const dynamic = "force-dynamic"; // กัน cache

export async function GET() {
    try {
        // แค่เช็ค DB ตอบกลับ
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({
            ok: true,
            db: "up",
            now: new Date().toISOString(),
        });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, db: "down", error: e?.message || String(e) },
            { status: 500 }
        );
    }
}

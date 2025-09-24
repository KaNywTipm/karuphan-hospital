import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { email, code, password, confirmPassword } = await req.json().catch(() => ({}));

    const safeEmail = String(email || "").trim().toLowerCase();
    const otp = String(code || "");
    const pw = String(password || "");
    const confirm = String(confirmPassword || "");

    if (!safeEmail || !otp || pw.length < 8 || pw !== confirm) {
        return NextResponse.json({ ok: false, error: "ข้อมูลไม่ครบ หรือรหัสผ่านไม่ถูกต้อง" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (!user) return NextResponse.json({ ok: false, error: "OTP ไม่ถูกต้อง" }, { status: 400 });

    const reqRow = await prisma.passwordResetRequest.findFirst({
        where: { userId: user.id, consumed: false },
        orderBy: { id: "desc" },
    });
    if (!reqRow) return NextResponse.json({ ok: false, error: "OTP ไม่ถูกต้อง" }, { status: 400 });
    if (reqRow.expiresAt < new Date()) return NextResponse.json({ ok: false, error: "OTP หมดอายุ" }, { status: 400 });
    if (reqRow.attempts >= reqRow.maxAttempts) return NextResponse.json({ ok: false, error: "พยายามเกินกำหนด" }, { status: 400 });

    const passed = await verifyOtp(otp, reqRow.otpHash);

    // เพิ่ม attempts ทุกครั้ง (กัน brute force)
    await prisma.passwordResetRequest.update({
        where: { id: reqRow.id },
        data: { attempts: { increment: 1 } },
    });

    if (!passed) return NextResponse.json({ ok: false, error: "OTP ไม่ถูกต้อง" }, { status: 400 });

    const passwordHash = await bcrypt.hash(pw, 12);

    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
        prisma.passwordResetRequest.update({ where: { id: reqRow.id }, data: { consumed: true } }),
    ]);

    return NextResponse.json({ ok: true });
}

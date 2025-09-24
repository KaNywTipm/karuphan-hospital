import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendOtpMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const { email } = await req.json().catch(() => ({}));
    const safeEmail = String(email || "").trim().toLowerCase();
    if (!safeEmail) {
        return NextResponse.json({ ok: false, error: "กรอกอีเมล" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: safeEmail } });

    // เพื่อความปลอดภัย ไม่บอกว่า "ไม่มีอีเมลนี้" ให้ตอบ ok เสมอ
    if (!user || user.isActive === false) {
        return NextResponse.json({ ok: true });
    }

    // ยกเลิกคำขอเก่าที่ยังไม่ใช้ (single-use)
    await prisma.passwordResetRequest.updateMany({
        where: { userId: user.id, consumed: false },
        data: { consumed: true },
    });

    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp);
    const expireMin = Number(process.env.OTP_EXPIRE_MIN || 10);

    await prisma.passwordResetRequest.create({
        data: {
            userId: user.id,
            otpHash,
            expiresAt: new Date(Date.now() + expireMin * 60_000),
            maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
        },
    });

    await sendOtpMail(safeEmail, otp);
    return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyOtpForEmail } from "@/lib/otp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { email, code, password, confirmPassword } = await req
            .json()
            .catch(() => ({}));

        const safeEmail = String(email || "")
            .trim()
            .toLowerCase();
        const otp = String(code || "");
        const pw = String(password || "");
        const confirm = String(confirmPassword || "");

        if (!safeEmail || !otp || pw.length < 8 || pw !== confirm) {
            return NextResponse.json(
                { ok: false, error: "ข้อมูลไม่ครบ หรือรหัสผ่านไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // ตรวจสอบ OTP
        const otpResult = await verifyOtpForEmail(safeEmail, otp);
        if (!otpResult.success) {
            return NextResponse.json(
                { ok: false, error: otpResult.error },
                { status: 400 }
            );
        }

        // หา user และ password reset request
        const user = await prisma.user.findUnique({ where: { email: safeEmail } });
        if (!user) {
            return NextResponse.json(
                { ok: false, error: "เกิดข้อผิดพลาด" },
                { status: 400 }
            );
        }

        const reqRow = await prisma.passwordResetRequest.findFirst({
            where: { userId: user.id, consumed: false },
            orderBy: { id: "desc" },
        });

        if (!reqRow) {
            return NextResponse.json(
                { ok: false, error: "เกิดข้อผิดพลาด" },
                { status: 400 }
            );
        }

        // อัปเดตรหัสผ่านและ mark request เป็น consumed
        const passwordHash = await bcrypt.hash(pw, 12);

        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
            prisma.passwordResetRequest.update({
                where: { id: reqRow.id },
                data: { consumed: true }
            }),
        ]);

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("[password reset] error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "เกิดข้อผิดพลาดในระบบ" },
            { status: 500 }
        );
    }
}
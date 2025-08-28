import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function genCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 หลัก
}

export async function POST(req: Request) {
    const { email } = await req.json();
    if (!email)
        return NextResponse.json(
            { ok: false, error: "กรอกอีเมล" },
            { status: 400 }
        );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: true }); // บอกสำเร็จเสมอ (ไม่เผยว่าอีเมลมี/ไม่มี)

    const code = genCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    await prisma.passwordResetRequest.create({
        data: { email, code, expiresAt },
    });

    // DEV: แสดงใน log (โปรดต่ออีเมลจริงด้วย nodemailer/Resend ใน production)
    console.log("[RESET OTP]", email, code);

    return NextResponse.json({ ok: true });
}

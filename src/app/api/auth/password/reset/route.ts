import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    const { email, code, password, confirmPassword } = await req.json();

    if (!email || !code || !password || !confirmPassword)
        return NextResponse.json(
            { ok: false, error: "กรอกข้อมูลให้ครบ" },
            { status: 400 }
        );

    if (password !== confirmPassword)
        return NextResponse.json(
            { ok: false, error: "รหัสผ่านไม่ตรงกัน" },
            { status: 400 }
        );

    const hash = await bcrypt.hash(password, 12);

    const reqRow = await prisma.passwordResetRequest.findFirst({
        where: { email, code, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
    });

    if (!reqRow)
        return NextResponse.json(
            { ok: false, error: "OTP ไม่ถูกต้องหรือหมดอายุ" },
            { status: 400 }
        );

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return NextResponse.json(
            { ok: false, error: "ไม่พบผู้ใช้" },
            { status: 404 }
        );

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
        prisma.user.update({ where: { email }, data: { passwordHash } }),
        prisma.passwordResetRequest.update({
            where: { id: reqRow.id },
            data: { usedAt: new Date() },
        }),
    ]);

    return NextResponse.json({ ok: true });
}

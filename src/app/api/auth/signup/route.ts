import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const {
            fullName,
            phone,
            email,
            password,
            confirmPassword,
            role = "EXTERNAL",
            departmentId,
        } = await req.json();

        if (!fullName || !email || !password || !confirmPassword)
            return NextResponse.json(
                { ok: false, error: "กรอกข้อมูลให้ครบ" },
                { status: 400 }
            );

        if (password !== confirmPassword)
            return NextResponse.json(
                { ok: false, error: "รหัสผ่านไม่ตรงกัน" },
                { status: 400 }
            );

        const existed = await prisma.user.findUnique({ where: { email } });
        if (existed)
            return NextResponse.json(
                { ok: false, error: "อีเมลนี้ถูกใช้แล้ว" },
                { status: 409 }
            );

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                fullName,
                phone,
                email,
                passwordHash,
                role, // "ADMIN" | "INTERNAL" | "EXTERNAL"
                departmentId: departmentId ?? null,
                isActive: true,
            },
            select: { id: true, fullName: true, email: true, role: true },
        });

        return NextResponse.json({ ok: true, user }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e.message ?? "Signup error" },
            { status: 500 }
        );
    }
}

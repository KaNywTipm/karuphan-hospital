import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const INTERNAL_DEPT_NAME = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const fullName = String(body.fullName || "").trim();
        const email = String(body.email || "")
            .toLowerCase()
            .trim();
        const password = String(body.password || "");
        const phone = body.phone ? String(body.phone).trim() : null;
        // ส่งมาจากฟอร์มสมัคร (แนะนำให้ส่ง departmentId จะเสถียรกว่า)
        const departmentName = String(body.departmentName || "").trim();

        if (!fullName || !email || !password) {
            return NextResponse.json(
                { ok: false, error: "กรอกข้อมูลให้ครบ" },
                { status: 400 }
            );
        }

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists)
            return NextResponse.json(
                { ok: false, error: "อีเมลนี้ถูกใช้แล้ว" },
                { status: 409 }
            );

        let department = null as { id: number; name: string } | null;
        if (departmentName) {
            department = await prisma.department.findUnique({
                where: { name: departmentName },
            });
            if (!department)
                return NextResponse.json(
                    { ok: false, error: "ไม่พบหน่วยงาน" },
                    { status: 400 }
                );
        }

        const role =
            department?.name === INTERNAL_DEPT_NAME ? "INTERNAL" : "EXTERNAL";
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                fullName,
                email,
                phone,
                passwordHash,
                role,
                departmentId: department?.id ?? null,
                isActive: true,
            },
        });

        return NextResponse.json({ ok: true, user }, { status: 201 });
    } catch (e) {
        console.error("signup error", e);
        return NextResponse.json(
            { ok: false, error: "สมัครไม่สำเร็จ" },
            { status: 500 }
        );
    }
}

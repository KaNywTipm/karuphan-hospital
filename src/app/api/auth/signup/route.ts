import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const PCU_LABEL = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";

const SignUpSchema = z.object({
    fullName: z.string().min(1, "กรอกชื่อ-นามสกุล"),
    phone: z.string().optional().transform(v => (v?.trim() ? v.trim() : undefined)),
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
    departmentName: z.string().min(1, "เลือก/กรอกหน่วยงาน"),
}).refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "รหัสผ่านไม่ตรงกัน",
});

export async function POST(req: Request) {
    try {
        const body = SignUpSchema.parse(await req.json());

        // กำหนดบทบาทจากชื่อหน่วยงาน
        const role: "INTERNAL" | "EXTERNAL" =
            body.departmentName.trim() === PCU_LABEL ? "INTERNAL" : "EXTERNAL";

        // กันอีเมลซ้ำ
        const existed = await prisma.user.findUnique({ where: { email: body.email } });
        if (existed) {
            return NextResponse.json({ ok: false, error: "อีเมลนี้มีผู้ใช้งานแล้ว" }, { status: 409 });
        }

        // ✅ หา/สร้าง Department ก่อน แล้วค่อย connect ด้วย id
        const deptName = body.departmentName.trim();

        let dept = await prisma.department.findFirst({
            where: { name: deptName },
            select: { id: true },
        });

        if (!dept) {
            dept = await prisma.department.create({
                data: { name: deptName },
                select: { id: true },
            });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);

        const user = await prisma.user.create({
            data: {
                fullName: body.fullName,
                phone: body.phone,
                email: body.email,
                role,                    // enum: ADMIN | INTERNAL | EXTERNAL
                passwordHash,
                // ❗ใช้ relation object แทนสตริง
                department: { connect: { id: dept.id } },
            },
            select: { id: true, role: true },
        });

        return NextResponse.json({ ok: true, user });
    } catch (err: any) {
        if (err?.name === "ZodError") {
            const msg = err.issues?.[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
            return NextResponse.json({ ok: false, error: msg }, { status: 400 });
        }
        if (err?.code === "P2002") {
            return NextResponse.json({ ok: false, error: "อีเมลนี้มีผู้ใช้งานแล้ว" }, { status: 409 });
        }
        console.error("SIGNUP_ERROR:", err);
        return NextResponse.json({ ok: false, error: "สมัครไม่สำเร็จ" }, { status: 500 });
    }
}

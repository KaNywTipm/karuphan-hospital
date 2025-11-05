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

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!safeEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "กรุณาระบุอีเมล",
          type: "warning",
          title: "ข้อมูลไม่ครบถ้วน",
        },
        { status: 400 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        {
          ok: false,
          error: "กรุณาระบุรหัสยืนยัน",
          type: "warning",
          title: "ข้อมูลไม่ครบถ้วน",
        },
        { status: 400 }
      );
    }

    // ตรวจสอบความยาวของรหัสผ่าน
    if (pw.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
          type: "warning",
          title: "รหัสผ่านไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    // ตรวจสอบการยืนยันรหัสผ่าน
    if (pw !== confirm) {
      return NextResponse.json(
        {
          ok: false,
          error: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน",
          type: "warning",
          title: "รหัสผ่านไม่ตรงกัน",
        },
        { status: 400 }
      );
    }

    // ตรวจสอบ OTP
    const otpResult = await verifyOtpForEmail(safeEmail, otp);
    if (!otpResult.success) {
      return NextResponse.json(
        {
          ok: false,
          error: otpResult.error || "รหัสยืนยันไม่ถูกต้อง หรือหมดอายุ",
          type: "error",
          title: "รหัสยืนยันไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    // หา user และ password reset request
    const user = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "ไม่พบผู้ใช้งานในระบบ",
          type: "error",
          title: "ไม่พบผู้ใช้งาน",
        },
        { status: 400 }
      );
    }

    const reqRow = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, consumed: false },
      orderBy: { id: "desc" },
    });

    if (!reqRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "ไม่พบคำขอรีเซ็ตรหัสผ่าน หรือคำขอถูกใช้งานแล้ว",
          type: "error",
          title: "คำขอไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ารหัสผ่านใหม่ไม่เหมือนรหัสผ่านเก่า
    const isSamePassword = await bcrypt.compare(pw, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        {
          ok: false,
          error: "รหัสผ่านใหม่ต้องไม่เหมือนกับรหัสผ่านเก่า",
          type: "warning",
          title: "รหัสผ่านซ้ำ",
        },
        { status: 400 }
      );
    }

    // อัปเดตรหัสผ่านและ mark request เป็น consumed
    const passwordHash = await bcrypt.hash(pw, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordResetRequest.update({
        where: { id: reqRow.id },
        data: { consumed: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message:
        "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้",
      type: "success",
      title: "รีเซ็ตรหัสผ่านสำเร็จ",
    });
  } catch (e: any) {
    console.error("[password reset] error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง",
        type: "error",
        title: "เกิดข้อผิดพลาด",
      },
      { status: 500 }
    );
  }
}

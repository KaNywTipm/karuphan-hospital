import { NextResponse } from "next/server";
import { sendOtpForPasswordReset } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
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

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          ok: false,
          error: "รูปแบบอีเมลไม่ถูกต้อง",
          type: "warning",
          title: "ข้อมูลไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const result = await sendOtpForPasswordReset(email);

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          type: "error",
          title: "ไม่สามารถส่งรหัสยืนยันได้",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "รหัสยืนยันถูกส่งไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย",
      type: "success",
      title: "ส่งรหัสยืนยันสำเร็จ",
    });
  } catch (e: any) {
    console.error("[password request] error:", e);
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

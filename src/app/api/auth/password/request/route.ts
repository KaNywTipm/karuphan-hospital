import { NextResponse } from "next/server";
import { sendOtpForPasswordReset } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "กรุณาระบุอีเมล" },
        { status: 400 }
      );
    }

    const result = await sendOtpForPasswordReset(email);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[password request] error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "เกิดข้อผิดพลาดในระบบ" },
      { status: 500 }
    );
  }
}

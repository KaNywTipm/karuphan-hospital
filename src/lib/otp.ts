import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { sendOtpEmail } from "./mailer";

export function generateOtp(len = 6): string {
  const digits = "0123456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += digits[Math.floor(Math.random() * digits.length)];
  return s; // คืน string เสมอ เช่น "012345"
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * สร้าง OTP สำหรับ email และบันทึกลงฐานข้อมูล
 * คืนค่า OTP string 6 หลักที่ใช้ส่งอีเมล
 */
export async function createOtpForEmail(email: string): Promise<string> {
  // ตรวจสอบว่ามี user อยู่หรือไม่
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    throw new Error("ไม่พบผู้ใช้ที่มีอีเมลนี้");
  }

  // สร้าง OTP และ hash
  const code = generateOtp(6); // คืน string 6 หลัก
  const hashedOtp = await hashOtp(code);

  // บันทึกข้อมูลการขอรีเซ็ตรหัสผ่าน
  await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      otpHash: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 นาที
      maxAttempts: 3,
      attempts: 0,
      consumed: false,
    },
  });

  return code; // คืน OTP string เพื่อใช้ส่งอีเมล
}

/**
 * ตรวจสอบ OTP ว่าถูกต้องและยังไม่หมดเวลา
 */
export async function verifyOtpForEmail(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const safeEmail = email.trim().toLowerCase();
    const otp = String(code || "");

    if (!safeEmail || !otp) {
      return { success: false, error: "ข้อมูลไม่ครบถ้วน" };
    }

    const user = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (!user) {
      return { success: false, error: "OTP ไม่ถูกต้อง" };
    }

    const reqRow = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, consumed: false },
      orderBy: { id: "desc" },
    });

    if (!reqRow) {
      return { success: false, error: "OTP ไม่ถูกต้อง" };
    }

    if (reqRow.expiresAt < new Date()) {
      return { success: false, error: "OTP หมดอายุ" };
    }

    if (reqRow.attempts >= reqRow.maxAttempts) {
      return { success: false, error: "พยายามเกินกำหนด" };
    }

    const passed = await verifyOtp(otp, reqRow.otpHash);

    // เพิ่ม attempts ทุกครั้ง (กัน brute force)
    await prisma.passwordResetRequest.update({
      where: { id: reqRow.id },
      data: { attempts: { increment: 1 } },
    });

    if (!passed) {
      return { success: false, error: "OTP ไม่ถูกต้อง" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "เกิดข้อผิดพลาด" };
  }
}

/**
 * สร้าง OTP และส่งอีเมลในขั้นตอนเดียว
 */
export async function sendOtpForPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const code = await createOtpForEmail(email);
    const result = await sendOtpEmail(email, code);

    if (!result.ok) {
      return { success: false, error: result.error || "ไม่สามารถส่งอีเมลได้" };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "เกิดข้อผิดพลาด" };
  }
}

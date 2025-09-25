import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ค่าดีฟอลต์สำหรับ from (แก้ได้จาก .env)
    const DEFAULT_FROM = process.env.RESEND_FROM || "ระบบครุภัณฑ์ <onboarding@resend.dev>";

export type MailInput = {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string; // เผื่อบางกรณีต้องการ override
};

export async function sendMail(input: MailInput) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set");
    }
    const from = input.from || DEFAULT_FROM;

    try {
        const { data, error } = await resend.emails.send({
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
            text: input.text ?? "",
        });

        if (error) {
            // ให้ error bubble ขึ้นไปเพื่อจะได้เห็นสาเหตุจริง เช่น from ผิด, domain ไม่ผ่าน
            throw new Error(
                typeof error === "string" ? error : JSON.stringify(error)
            );
        }
        return { ok: true, id: data?.id };
    } catch (err: any) {
        // ล็อกไว้ช่วยดีบัก 422/400 จาก Resend
        console.error("[sendMail] failed:", err?.message || err);
        return { ok: false, error: err?.message || "sendMail failed" };
    }
}

/** Helper สำหรับส่งอีเมล OTP */
export async function sendOtpEmail(to: string, code: string) {
    const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
    <h2>รหัสยืนยัน (OTP)</h2>
    <p>ใช้รหัสต่อไปนี้เพื่อยืนยันตัวตนในระบบครุภัณฑ์</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:12px;display:inline-block">
      ${code}
    </div>
    <p style="color:#6b7280">รหัสนี้จะหมดอายุภายใน 10 นาที</p>
  </div>`;
    return sendMail({
        to,
        subject: "รหัสยืนยัน OTP - ระบบครุภัณฑ์",
        html,
    });
}
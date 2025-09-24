import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendOtpMail(to: string, otp: string) {
    const from = process.env.MAIL_FROM || "no-reply@example.com";
    const mins = Number(process.env.OTP_EXPIRE_MIN || 10);
    const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <h2>ยืนยันการรีเซ็ตรหัสผ่าน</h2>
    <p>รหัส OTP ของคุณคือ</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</div>
    <p>รหัสมีอายุ ${mins} นาที และใช้ได้ครั้งเดียว</p>
    <hr/>
    <small>หากไม่ได้ร้องขอ โปรดละเว้นอีเมลฉบับนี้</small>
    </div>`;
    await resend.emails.send({
        from,
        to,
        subject: "OTP สำหรับรีเซ็ตรหัสผ่าน",
        html,
    });
}

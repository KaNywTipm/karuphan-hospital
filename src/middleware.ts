// middleware.ts
export { auth as middleware } from "@/lib/auth";

// เลือกแมตช์ทุกเส้นทาง ยกเว้นไฟล์สเตติกและ route ที่ไม่ควรดัก
export const config = {
  matcher: [
    // ทั้งเว็บ
    "/((?!_next/static|_next/image|favicon.ico|assets|images|icons|fonts).*)",
    // และไม่ดักเส้นทาง auth ของ NextAuth เอง + health
    // (เพราะเราจะอนุญาตใน authorized callback อยู่แล้ว)
  ],
};

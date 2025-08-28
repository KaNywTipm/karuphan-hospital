import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/api/auth"];

export default auth((req) => {
    const { pathname, origin } = req.nextUrl;
    const session = req.auth as any;

    // อนุญาต asset/system path
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/images") ||
        pathname === "/favicon.ico"
    )
        return NextResponse.next();

    // อนุญาตหน้าสาธารณะ
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        // ถ้าล็อกอินแล้วแต่ยังมาหน้า sign-in/sign-up/forgot → ส่งเข้าหน้าตาม role
        if (
            session &&
            (pathname === "/sign-in" ||
                pathname === "/sign-up" ||
                pathname === "/forgot-password")
        ) {
            const role = session.role;
            const to =
                role === "ADMIN"
                    ? "/role1-admin"
                    : role === "INTERNAL"
                        ? "/role2-internal"
                        : "/role3-external";
            return NextResponse.redirect(new URL(to, origin));
        }
        return NextResponse.next();
    }

    // ที่เหลือต้องล็อกอิน
    if (!session) return NextResponse.redirect(new URL("/sign-in", origin));

    // ตรวจสิทธิ์ตาม prefix ของเส้นทาง
    const role = session.role;
    if (pathname.startsWith("/role1-admin") && role !== "ADMIN")
        return NextResponse.redirect(new URL("/sign-in", origin));
    if (pathname.startsWith("/role2-internal") && role !== "INTERNAL")
        return NextResponse.redirect(new URL("/sign-in", origin));
    if (pathname.startsWith("/role3-external") && role !== "EXTERNAL")
        return NextResponse.redirect(new URL("/sign-in", origin));

    return NextResponse.next();
});

export const config = {
    // จับทุกเส้นทางยกเว้น api/_next/ไฟล์สาธารณะ
    matcher: ["/((?!_next|api|images|favicon.ico).*)"],
};

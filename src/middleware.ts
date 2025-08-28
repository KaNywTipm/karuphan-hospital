// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/api/auth"];

const landingOf = (role: "ADMIN" | "INTERNAL" | "EXTERNAL") =>
    role === "ADMIN"
        ? "/role1-admin"
        : role === "INTERNAL"
            ? "/role2-internal"
            : "/role3-external";

export default auth((req) => {
    const { pathname, origin } = req.nextUrl;
    const session = req.auth as any;

    // ปล่อยไฟล์สาธารณะ (.png .css .js ฯลฯ)
    if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

    // ปล่อย asset ระบบ
    if (pathname.startsWith("/_next") || pathname === "/favicon.ico")
        return NextResponse.next();

    // หน้าสาธารณะ
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        if (
            session &&
            (pathname === "/sign-in" ||
                pathname === "/sign-up" ||
                pathname === "/forgot-password")
        ) {
            return NextResponse.redirect(new URL(landingOf(session.role), origin));
        }
        return NextResponse.next();
    }

    // ต้องล็อกอิน
    if (!session) return NextResponse.redirect(new URL("/sign-in", origin));

    // RBAC ตาม prefix
    const role = session.role as "ADMIN" | "INTERNAL" | "EXTERNAL";
    if (pathname.startsWith("/role1-admin") && role !== "ADMIN")
        return NextResponse.redirect(new URL(landingOf(role), origin));

    if (pathname.startsWith("/role2-internal") && role !== "INTERNAL")
        return NextResponse.redirect(new URL(landingOf(role), origin));

    if (pathname.startsWith("/role3-external") && role !== "EXTERNAL")
        return NextResponse.redirect(new URL(landingOf(role), origin));

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next|api|favicon.ico).*)"], // api/auth ถูกปล่อยภายในโค้ดด้านบนแล้ว
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    const role = (token as any)?.role as "ADMIN" | "INTERNAL" | "EXTERNAL" | undefined;

    if (!token && !url.pathname.startsWith("/sign-in") && !url.pathname.startsWith("/sign-up")) {
        return NextResponse.redirect(new URL("/sign-in", url));
    }

    if (url.pathname.startsWith("/role1-admin") && role !== "ADMIN")
        return NextResponse.redirect(new URL("/", url));

    if (url.pathname.startsWith("/role2-internal") && !["ADMIN", "INTERNAL"].includes(role!))
        return NextResponse.redirect(new URL("/", url));

    if (url.pathname.startsWith("/role3-external") && !["ADMIN", "EXTERNAL"].includes(role!))
        return NextResponse.redirect(new URL("/", url));

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/role1-admin/:path*", "/role2-internal/:path*", "/role3-external/:path*", "/menu/:path*"],
};

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

export async function requireRole(allowed: Role[]) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const role = String((session.user as any).role ?? "").toUpperCase() as Role;
    if (!allowed.includes(role)) {
        return NextResponse.json({ ok: false, error: "forbidden", role }, { status: 403 });
    }
    return null; // ผ่าน
}

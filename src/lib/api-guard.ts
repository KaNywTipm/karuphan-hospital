// src/lib/api-guard.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function guardApi(roles: ("ADMIN" | "INTERNAL" | "EXTERNAL")[]) {
    const session = await auth();
    if (!session)
        return NextResponse.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 }
        );
    const role = (session as any).role;
    if (!roles.includes(role))
        return NextResponse.json(
            { ok: false, error: "Forbidden" },
            { status: 403 }
        );
    return session;
}

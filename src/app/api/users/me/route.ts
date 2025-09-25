import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const userSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    role: true,
    isActive: true,
    departmentId: true,
    department: { select: { id: true, name: true } },
} as const;

const UpdateSchema = z.object({
    fullName: z.string().min(1, "กรอกชื่อ-สกุล"),
    phone: z.string().min(3, "กรอกเบอร์โทร").max(50),
    departmentId: z.number().int().positive().nullable().optional(),
});

export async function GET() {
    try {
        const session = await auth();
        const sUser = session?.user as any;

        if (!sUser) {
            return NextResponse.json(
                { ok: false, error: "unauthenticated" },
                { status: 401 }
            );
        }

        const rawId = sUser.id;
        const email = sUser.email?.toString().trim() || null;

        let user = null;

        // ลองด้วย id ก่อน (ต้องเป็นเลขล้วน)
        const id = Number(rawId);
        if (Number.isFinite(id) && id > 0) {
            user = await prisma.user.findUnique({
                where: { id },
                select: userSelect,
            });
        }

        // ถ้าไม่เจอ/ไม่มี id แต่มี email ให้ลองหาโดย email
        if (!user && email) {
            user = await prisma.user.findUnique({
                where: { email },
                select: userSelect,
            });
        }

        if (!user) {
            return NextResponse.json(
                { ok: false, error: "user-not-found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ ok: true, user });
    } catch (e: any) {
        console.error("[/api/users/me] error:", e);
        return NextResponse.json(
            { ok: false, error: "internal-error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth();
        const sUser = session?.user as any;

        if (!sUser) {
            return NextResponse.json(
                { ok: false, error: "unauthenticated" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const parsed = UpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { fullName, phone, departmentId } = parsed.data;

        const rawId = sUser.id;
        const email = sUser.email?.toString().trim() || null;

        let userId: number | null = null;

        // ลองด้วย id ก่อน (ต้องเป็นเลขล้วน)
        const id = Number(rawId);
        if (Number.isFinite(id) && id > 0) {
            const user = await prisma.user.findUnique({
                where: { id },
                select: { id: true },
            });
            if (user) userId = id;
        }

        // ถ้าไม่เจอ/ไม่มี id แต่มี email ให้ลองหาโดย email
        if (!userId && email) {
            const user = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });
            if (user) userId = user.id;
        }

        if (!userId) {
            return NextResponse.json(
                { ok: false, error: "user-not-found" },
                { status: 404 }
            );
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { fullName, phone, departmentId: departmentId ?? null },
            select: userSelect,
        });

        return NextResponse.json({ ok: true, user: updated });
    } catch (e: any) {
        console.error("[/api/users/me PUT] error:", e);
        return NextResponse.json(
            { ok: false, error: "internal-error" },
            { status: 500 }
        );
    }
}

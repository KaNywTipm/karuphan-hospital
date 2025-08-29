import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            orderBy: { id: "asc" },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                department: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json(users);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            username,
            password,
            fullName,
            phone,
            email,
            role = Role.EXTERNAL,
            department,
            isActive = true,
        } = body;
        if (!username || !password || !fullName)
            return NextResponse.json(
                { error: "username, password, fullName จำเป็น" },
                { status: 400 }
            );

        const created = await prisma.user.create({
            data: {
                username,
                password, // โปรดเปลี่ยนเป็น hash ก่อนใช้จริง
                fullName,
                phone: phone ?? null,
                email: email ?? null,
                role,
                department: department ?? null,
                isActive,
            },
            select: { id: true, username: true, role: true },
        });
        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

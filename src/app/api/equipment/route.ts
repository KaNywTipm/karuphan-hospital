import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { EquipmentStatus, LocationType } from "@prisma/client";

export async function GET() {
    try {
        const items = await prisma.equipment.findMany({
            orderBy: { number: "asc" },
            include: { category: true },
        });
        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            code,
            name,
            categoryId,
            department,
            location = LocationType.INTERNAL,
            receivedDate,
            price,
            status = EquipmentStatus.NORMAL,
            description,
            serialNumber,
            brand,
            model,
        } = body;

        if (!code || !name || !categoryId || !receivedDate)
            return NextResponse.json(
                { error: "code, name, categoryId, receivedDate จำเป็น" },
                { status: 400 }
            );

        const created = await prisma.equipment.create({
            data: {
                code,
                name,
                categoryId: Number(categoryId),
                department: department ?? null,
                location,
                receivedDate: new Date(receivedDate),
                price: price != null ? String(price) : null, // Prisma Decimal รับ string ได้
                status,
                description: description ?? null,
                serialNumber: serialNumber ?? null,
                brand: brand ?? null,
                model: model ?? null,
            },
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

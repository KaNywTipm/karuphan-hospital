import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: { id: string } }) {
    try {
        const item = await prisma.equipment.findUnique({
            where: { number: Number(params.id) },
            include: { category: true },
        });
        if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
        return NextResponse.json(item);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const updated = await prisma.equipment.update({
            where: { number: Number(params.id) },
            data: {
                ...body,
                categoryId: body.categoryId ? Number(body.categoryId) : undefined,
                price: body.price != null ? String(body.price) : undefined,
                receivedDate: body.receivedDate ? new Date(body.receivedDate) : undefined,
            },
        });
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    try {
        await prisma.equipment.delete({ where: { number: Number(params.id) } });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

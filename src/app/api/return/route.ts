import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BorrowStatus, EquipmentStatus } from '@prisma/client';

export async function POST(req: Request) {
    const body = await req.json();
    try {
        const { borrowRequestId, receivedById, returnCondition = EquipmentStatus.NORMAL, returnNotes } = body;

        if (!borrowRequestId || !receivedById) {
            return NextResponse.json({ error: 'borrowRequestId และ receivedById จำเป็น' }, { status: 400 });
        }

        const br = await prisma.borrowRequest.findUnique({
            where: { id: Number(borrowRequestId) },
            include: { items: true },
        });
        if (!br) return NextResponse.json({ error: 'BorrowRequest not found' }, { status: 404 });
        if (br.status === BorrowStatus.RETURNED) {
            return NextResponse.json({ error: 'คำขอนี้ถูกบันทึกคืนแล้ว' }, { status: 400 });
        }

        const now = new Date();
        const ids = br.items.map(i => i.equipmentId);

        const result = await prisma.$transaction(async (tx) => {
            // อัปเดตคำขอ
            const updated = await tx.borrowRequest.update({
                where: { id: br.id },
                data: {
                    status: BorrowStatus.RETURNED,
                    actualReturnDate: now,
                    returnCondition,
                    returnNotes: returnNotes ?? null,
                    receivedById: Number(receivedById),
                },
                include: { items: true },
            });

            // อัปเดตสถานะครุภัณฑ์ตามสภาพคืน
            const targetStatus =
                returnCondition === EquipmentStatus.NORMAL ? EquipmentStatus.NORMAL : returnCondition;

            await tx.equipment.updateMany({
                where: { number: { in: ids } },
                data: { status: targetStatus },
            });

            return updated;
        });

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

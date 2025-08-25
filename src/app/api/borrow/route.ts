import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BorrowerType, BorrowStatus, EquipmentStatus } from '@prisma/client';

export async function POST(req: Request) {
    const body = await req.json();
    try {
        const {
            borrowerType, requesterId, externalName, externalDept, externalPhone,
            returnDue, reason, items,
            approvedById, // เผื่อกรณี internal auto-approve
        } = body;

        if (!borrowerType || !returnDue || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'borrowerType, returnDue, items จำเป็น' }, { status: 400 });
        }

        // ตรวจสอบว่าอุปกรณ์ทุกชิ้นว่างอยู่
        const ids = items.map((i: any) => Number(i.equipmentId));
        const eqs = await prisma.equipment.findMany({ where: { number: { in: ids } } });
        if (eqs.length !== ids.length) {
            return NextResponse.json({ error: 'มี equipmentId ไม่ถูกต้อง' }, { status: 400 });
        }
        const notAvailable = eqs.filter(e => e.status !== EquipmentStatus.NORMAL);
        if (notAvailable.length) {
            return NextResponse.json({ error: 'มีครุภัณฑ์ไม่พร้อมยืม', details: notAvailable.map(n => n.code) }, { status: 400 });
        }

        const isInternal = borrowerType === BorrowerType.INTERNAL;
        const now = new Date();

        const result = await prisma.$transaction(async (tx) => {
            const borrow = await tx.borrowRequest.create({
                data: {
                    borrowerType,
                    requesterId: isInternal ? Number(requesterId) : null,
                    externalName: !isInternal ? (externalName ?? null) : null,
                    externalDept: !isInternal ? (externalDept ?? null) : null,
                    externalPhone: !isInternal ? (externalPhone ?? null) : null,
                    status: isInternal ? BorrowStatus.APPROVED : BorrowStatus.PENDING,
                    borrowDate: isInternal ? now : null,
                    returnDue: new Date(returnDue),
                    reason: reason ?? null,
                    approvedById: isInternal ? (approvedById ?? null) : null,
                    approvedAt: isInternal ? now : null,
                    items: {
                        create: items.map((i: any) => ({
                            equipmentId: Number(i.equipmentId),
                            quantity: Number(i.quantity ?? 1),
                        })),
                    },
                },
                include: { items: true },
            });

            // อัปเดตสถานะครุภัณฑ์ที่ถูกยืม → IN_USE ถ้าอนุมัติแล้ว (internal)
            if (borrow.status === BorrowStatus.APPROVED) {
                await tx.equipment.updateMany({
                    where: { number: { in: ids } },
                    data: { status: EquipmentStatus.IN_USE },
                });
            }

            return borrow;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

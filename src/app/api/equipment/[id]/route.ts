import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EquipmentUpdateSchema } from "@/lib/validators/equipment";

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(_req: Request, { params }: { params: { number: string } }) {
    const number = Number(params.number);
    const row = await prisma.equipment.findUnique({ where: { number }, include: { category: true } });
    if (!row) return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
    return NextResponse.json({
        data: {
            number: row.number, code: row.code, idnum: row.idnum, name: row.name,
            description: row.description, price: row.price, receivedDate: toYmd(row.receivedDate),
            status: row.status, category: { id: row.categoryId, name: row.category.name }
        }
    });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();

        const number = Number(params.id);
        if (!Number.isInteger(number)) {
            return NextResponse.json({ ok: false, error: "id ไม่ถูกต้อง" }, { status: 400 });
        }
        const parsed = EquipmentUpdateSchema.parse(body);

        const updated = await prisma.equipment.update({
            where: { number },
            data: {
                ...(parsed.code !== undefined ? { code: parsed.code.trim() } : {}),
                ...(parsed.idnum !== undefined ? { idnum: parsed.idnum || null } : {}),
                ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
                ...(parsed.description !== undefined ? { description: parsed.description || null } : {}),
                ...(parsed.price !== undefined ? { price: parsed.price ?? null } : {}),
                ...(parsed.receivedDate !== undefined ? { receivedDate: new Date(parsed.receivedDate) } : {}),
                ...(parsed.status !== undefined ? { status: parsed.status } : {}),
                ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {})
            },
            include: { category: true }
        });

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        const msg =
            e?.code === "P2025" ? "ไม่พบรายการ" :
                e?.code === "P2002" ? "เลขครุภัณฑ์/รหัสซ้ำในระบบ" :
                    e?.message || "เกิดข้อผิดพลาด";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

// *DELETE: hard delete เฉพาะกรณีไม่มีประวัติยืม; ถ้ามีจะ error (onDelete: Restrict)
export async function DELETE(_req: Request, { params }: { params: { number: string } }) {
    try {
        const number = Number(params.number);
        await prisma.equipment.delete({ where: { number } });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        const msg = e?.code === "P2025" ? "ไม่พบรายการ" : "ลบไม่ได้ (อาจมีประวัติยืมผูกอยู่)";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

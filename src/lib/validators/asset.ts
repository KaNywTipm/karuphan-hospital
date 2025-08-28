import { z } from "zod";
import { EquipmentStatus } from "@prisma/client";

export const CategoryCreateSchema = z.object({
    name: z.string().min(2, "กรอกชื่อหมวดหมู่อย่างน้อย 2 ตัวอักษร"),
    description: z.string().max(500).optional().nullable(),
});
export const CategoryUpdateSchema = CategoryCreateSchema.extend({
    isActive: z.boolean().optional(),
});

export const EquipmentCreateSchema = z.object({
    idnum: z.string().trim().optional().nullable(),
    code: z.string().trim().min(1, "กรอกรหัสครุภัณฑ์"),
    name: z.string().trim().min(2, "กรอกชื่อครุภัณฑ์"),
    categoryId: z.coerce.number().int().positive("เลือกหมวดหมู่"),
    receivedDate: z.coerce.date(),
    price: z.coerce.number().nonnegative("ราคา >= 0").optional(),
    status: z.nativeEnum(EquipmentStatus).default("NORMAL"),
    description: z.string().max(2000).optional().nullable(),
});

export const EquipmentUpdateSchema = EquipmentCreateSchema.partial();

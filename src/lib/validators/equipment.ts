import { z } from "zod";

export const EquipmentCreateSchema = z.object({
    code: z.string().min(1, "กรุณาระบุเลขครุภัณฑ์"),
    idnum: z.string().optional().nullable(), // เลขครุภัณฑ์ย่อย (ถ้ามี)
    name: z.string().min(1, "กรุณาระบุชื่อครุภัณฑ์"),
    description: z.string().optional().nullable(), // รายละเอียด
    price: z.number().nonnegative().optional().nullable(),
    receivedDate: z.string().min(8), // "YYYY-MM-DD" (ค.ศ.)
    categoryId: z.number().int().positive(),
    status: z
        .enum(["NORMAL", "IN_USE", "BROKEN", "LOST", "WAIT_DISPOSE", "DISPOSED"])
        .optional(),
});

export const EquipmentUpdateSchema = EquipmentCreateSchema.partial();
export type EquipmentCreateInput = z.infer<typeof EquipmentCreateSchema>;
export type EquipmentUpdateInput = z.infer<typeof EquipmentUpdateSchema>;

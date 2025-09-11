import { z } from "zod";

export const zUserRole = z.enum(["ADMIN", "INTERNAL", "EXTERNAL"]);

export const UserUpdateSchema = z.object({
    fullName: z.string().min(2, "กรอกชื่อ-สกุลอย่างน้อย 2 ตัวอักษร").optional(),
    phone: z.string().trim().min(6).max(20).nullable().optional(),
    role: zUserRole.optional(),
    departmentId: z.coerce.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    // เพิ่มเหตุผลการเปลี่ยนกลุ่มงาน (ไม่บังคับ)
    changeNote: z.string().trim().max(500).optional(),
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

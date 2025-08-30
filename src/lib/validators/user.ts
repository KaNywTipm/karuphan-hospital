import { z } from "zod";

export const UserUpdateSchema = z.object({
    fullName: z.string().min(2, "กรอกชื่อ-สกุลอย่างน้อย 2 ตัวอักษร").optional(),
    phone: z.string().trim().min(6).max(20).nullable().optional(),
    role: z.enum(["ADMIN", "INTERNAL", "EXTERNAL"]).optional(),
    departmentId: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    // เพิ่มเหตุผลการเปลี่ยนกลุ่มงาน (ไม่บังคับ)
    changeNote: z.string().trim().max(500).optional(),
});

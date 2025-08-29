import { z } from "zod";

export const CategoryCreateSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
    description: z.string().optional().nullable(),
});

export const CategoryUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
});

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;

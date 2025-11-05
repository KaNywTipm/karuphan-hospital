import { z } from "zod";

export const CategoryCreateSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
    description: z.string().optional().nullable(),
});

export const CategoryUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
});

export const CategoryUpsertSchema = z.object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
});

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryUpsertInput = z.infer<typeof CategoryUpsertSchema>;

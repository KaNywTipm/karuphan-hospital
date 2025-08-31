import { z } from "zod";

export const BorrowItemSchema = z.object({
    equipmentId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive().default(1),
});

export const BorrowCreateSchema = z.object({
    borrowerType: z.enum(["INTERNAL", "EXTERNAL"]),
    returnDue: z.string().min(10), // YYYY-MM-DD
    reason: z.string().nullable().optional(),
    items: z.array(BorrowItemSchema).min(1),
});

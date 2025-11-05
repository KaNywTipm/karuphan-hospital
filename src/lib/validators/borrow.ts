import { z } from "zod";

export const zReturnCondition = z.enum([
  "NORMAL",
  "BROKEN",
  "LOST",
  "WAIT_DISPOSE",
  "DISPOSED",
]);
export const zBorrowerType = z.enum(["INTERNAL", "EXTERNAL"]);

export const BorrowItemSchema = z.object({
  equipmentId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).default(1),
});

const BorrowBase = z.object({
  borrowDate: z.coerce.date().optional(),
  returnDue: z.coerce.date(),
  reason: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z.array(BorrowItemSchema).min(1),
});

const BorrowInternal = BorrowBase.extend({
  borrowerType: z.literal("INTERNAL"),
});

const BorrowExternal = BorrowBase.extend({
  borrowerType: z.literal("EXTERNAL"),
  externalName: z.string().trim().min(1),
  externalDept: z.string().trim().min(1),
  externalPhone: z.string().trim().min(6),
});

export const BorrowCreateSchema = z.discriminatedUnion("borrowerType", [
  BorrowInternal,
  BorrowExternal,
]);

export const BorrowApproveSchema = z.object({
  borrowDate: z.coerce.date().optional(),
});

export const BorrowRejectSchema = z.object({
  rejectReason: z.string().trim().min(1),
});

export const BorrowReturnSchema = z.object({
  returnCondition: zReturnCondition,
  returnNotes: z.string().trim().max(500).optional(),
});

export type BorrowItemInput = z.infer<typeof BorrowItemSchema>;
export type BorrowCreateInput = z.infer<typeof BorrowCreateSchema>;

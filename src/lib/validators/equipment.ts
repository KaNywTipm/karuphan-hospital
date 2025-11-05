import { z } from "zod";

export const zEquipStatus = z.enum([
  "NORMAL",
  "IN_USE",
  "RESERVED",
  "BROKEN",
  "LOST",
  "WAIT_DISPOSE",
  "DISPOSED",
]);

export const EquipmentUpsertSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุเลขครุภัณฑ์"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อครุภัณฑ์"),
  idnum: z.string().trim().nullable().optional(),
  categoryId: z.coerce.number().int().positive(),
  receivedDate: z.coerce.date(),
  price: z.coerce.number().nonnegative().optional(),
  status: zEquipStatus.optional(),
  description: z.string().trim().max(1000).optional(),
});

export type EquipmentUpsertInput = z.infer<typeof EquipmentUpsertSchema>;

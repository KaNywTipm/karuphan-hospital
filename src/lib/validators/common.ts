import { z } from "zod";

export const zListStatus = z.enum([
  "PENDING",
  "APPROVED",
  "RETURNED",
  "REJECTED",
]);

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  status: z
    .preprocess(
      (v) => (Array.isArray(v) ? v : v ? [v] : []),
      z.array(zListStatus)
    )
    .optional(),
});

export type ListQueryInput = z.infer<typeof ListQuerySchema>;

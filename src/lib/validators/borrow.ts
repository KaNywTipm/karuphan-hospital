import { z } from "zod";
import { ReturnCondition } from "@prisma/client";

export const ApproveSchema = z.object({
    borrowDate: z.coerce.date().optional(), // default: now
});

export const RejectSchema = z.object({
    rejectReason: z.string().min(2, "กรอกเหตุผล"),
});

export const ReturnSchema = z.object({
    condition: z.nativeEnum(ReturnCondition, { required_error: "เลือกสภาพ" }),
    notes: z.string().max(2000).optional(),
    actualReturnDate: z.coerce.date().optional(), // default: now
});

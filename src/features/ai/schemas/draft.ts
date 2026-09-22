import { z } from "zod";
export const aiDraftSchema = z.object({
  type: z.enum(["expense", "income"]),
  amountMinor: z.number().int().safe().positive().max(1e12),
  title: z.string().min(1).max(160),
  suggestedCategory: z.string().nullable(),
  suggestedAccount: z.string().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
  confidence: z.number().min(0).max(1),
});
export type AiDraft = z.infer<typeof aiDraftSchema>;

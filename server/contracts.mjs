import { z } from "zod";
const amount = z.number().int().safe().min(0).max(1e12);
export const draftSchema = z.object({
  type: z.enum(["expense", "income"]),
  amountMinor: amount.refine((v) => v > 0),
  title: z.string().min(1).max(160),
  suggestedCategory: z.string().max(60).nullable(),
  suggestedAccount: z.string().max(80).nullable(),
  occurredAt: z.string().datetime({ offset: true }),
  confidence: z.number().min(0).max(1),
});
export const draftJsonSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["expense", "income"] },
    amountMinor: { type: "integer" },
    title: { type: "string" },
    suggestedCategory: { type: ["string", "null"] },
    suggestedAccount: { type: ["string", "null"] },
    occurredAt: { type: "string" },
    confidence: { type: "number" },
  },
  required: [
    "type",
    "amountMinor",
    "title",
    "suggestedCategory",
    "suggestedAccount",
    "occurredAt",
    "confidence",
  ],
};
const context = z.object({
  now: z.string().datetime({ offset: true }),
  timezone: z.string().max(80),
  accounts: z.array(z.string().max(80)).max(100),
  categories: z.array(z.string().max(60)).max(100),
});
export const parseSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  context,
});
export const receiptSchema = z.object({
  image: z
    .string()
    .min(4)
    .max(5600000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  context,
});
const total = z.number().int().safe();
const summary = z.object({ income: total, expense: total, net: total });
export const insightsSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  summary: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    current: summary,
    previous: summary,
    categories: z
      .array(z.object({ name: z.string().max(60), amount: total }))
      .max(100),
    budgets: z
      .array(
        z.object({ name: z.string().max(80), spent: total, remaining: total }),
      )
      .max(100),
  }),
});

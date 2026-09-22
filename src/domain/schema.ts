import { z } from "zod";
export const moneySchema = z
  .number()
  .int()
  .safe()
  .min(-1_000_000_000_000)
  .max(1_000_000_000_000);
const id = z.string().uuid();
const stamp = z.string().datetime({ offset: true });
export const accountSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  type: z.enum(["cash", "bank", "ewallet", "savings", "credit"]),
  currency: z.literal("VND"),
  openingBalanceMinor: moneySchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  archived: z.boolean(),
  order: z.number().int().default(0),
  createdAt: stamp,
  updatedAt: stamp,
});
export const categorySchema = z.object({
  id,
  type: z.enum(["expense", "income"]),
  name: z.string().trim().min(1).max(60),
  icon: z.string().max(40),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .default("#b9d5a4"),
  archived: z.boolean(),
});
export const transactionSchema = z
  .object({
    id,
    type: z.enum(["expense", "income", "transfer", "adjustment"]),
    amountMinor: moneySchema,
    accountId: id.optional(),
    fromAccountId: id.optional(),
    toAccountId: id.optional(),
    categoryId: id.optional(),
    merchant: z.string().max(120).optional(),
    title: z.string().trim().min(1).max(160),
    note: z.string().max(2000).optional(),
    occurredAt: stamp,
    recurringRuleId: id.optional(),
    recurringOccurrence: z.string().optional(),
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: stamp.optional(),
  })
  .superRefine((t, c) => {
    if (t.type !== "adjustment" && t.amountMinor <= 0)
      c.addIssue({
        code: "custom",
        message: "Số tiền phải lớn hơn 0",
        path: ["amountMinor"],
      });
    if (t.type === "transfer") {
      if (
        !t.fromAccountId ||
        !t.toAccountId ||
        t.fromAccountId === t.toAccountId
      )
        c.addIssue({ code: "custom", message: "Chọn hai tài khoản khác nhau" });
    } else if (!t.accountId)
      c.addIssue({ code: "custom", message: "Vui lòng chọn tài khoản" });
  });
export const budgetSchema = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  categoryId: id.optional(),
  period: z.literal("monthly"),
  amountMinor: moneySchema.refine((v) => v > 0),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  enabled: z.boolean(),
});
export const recurringSchema = z.object({
  id,
  transactionTemplate: z.object({
    type: z.enum(["expense", "income"]),
    amountMinor: moneySchema.refine((v) => v > 0),
    accountId: id,
    categoryId: id.optional(),
    title: z.string().trim().min(1).max(160),
  }),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(120),
  nextDate: z.string().date(),
  anchorDay: z.number().int().min(1).max(31).optional(),
  enabled: z.boolean(),
});
export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("dark"),
  privacy: z.boolean().default(false),
  aiEnabled: z.boolean().default(false),
  aiConsent: z.boolean().default(false),
  firstDay: z.enum(["monday", "sunday"]).default("monday"),
  language: z.literal("vi").default("vi"),
  currency: z.literal("VND").default("VND"),
  lastAccountId: z.string().optional(),
});
export type Account = z.infer<typeof accountSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type RecurringRule = z.infer<typeof recurringSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: stamp,
  accounts: z.array(accountSchema).max(1000),
  categories: z.array(categorySchema).max(5000),
  transactions: z.array(transactionSchema).max(100000),
  budgets: z.array(budgetSchema).max(5000),
  recurring: z.array(recurringSchema).max(5000),
  settings: settingsSchema,
});
export type Backup = z.infer<typeof backupSchema>;

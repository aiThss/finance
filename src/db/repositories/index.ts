import { db } from "../schema";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  recurringSchema,
  settingsSchema,
  transactionSchema,
  type Transaction,
  type Account,
  type Category,
  type Budget,
  type RecurringRule,
  type Settings,
} from "../../domain/schema";
import { dayKey, nextOccurrence } from "../../domain/money";
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
async function validateReferences(t: Transaction, previous?: Transaction) {
  for (const id of [t.accountId, t.fromAccountId, t.toAccountId].filter(
    Boolean,
  ) as string[]) {
    const a = await db.accounts.get(id);
    if (
      !a ||
      (a.archived &&
        ![
          previous?.accountId,
          previous?.fromAccountId,
          previous?.toAccountId,
        ].includes(id))
    )
      throw new Error("Tài khoản không tồn tại hoặc đã lưu trữ.");
  }
  if (t.categoryId) {
    const c = await db.categories.get(t.categoryId);
    if (
      !c ||
      (c.archived && previous?.categoryId !== c.id) ||
      t.type !== c.type
    )
      throw new Error("Danh mục không phù hợp với giao dịch.");
  }
}
async function saveTransaction(input: Transaction, updating: boolean) {
  const t = transactionSchema.parse(input);
  await db.transaction(
    "rw",
    [db.transactions, db.accounts, db.categories, db.preferences],
    async () => {
      const previous = await db.transactions.get(t.id);
      if (updating && !previous) throw new Error("Không tìm thấy giao dịch.");
      if (!updating && previous) throw new Error("Giao dịch đã tồn tại.");
      await validateReferences(t, previous);
      await db.transactions.put({
        ...t,
        createdAt: previous?.createdAt ?? t.createdAt,
        updatedAt: now(),
      });
      if (t.type === "expense") {
        const p = await db.preferences.get("settings");
        if (p && p.value.lastAccountId !== t.accountId)
          await db.preferences.put({
            id: "settings",
            value: { ...p.value, lastAccountId: t.accountId },
          });
      }
    },
  );
}
export const transactionRepository = {
  create: (t: Transaction) => saveTransaction(t, false),
  update: (t: Transaction) => saveTransaction(t, true),
  softDelete: async (id: string) => {
    await db.transactions.update(id, { deletedAt: now(), updatedAt: now() });
  },
  restore: async (id: string) => {
    await db.transactions.update(id, {
      deletedAt: undefined,
      updatedAt: now(),
    });
  },
  search: async (query: string) => {
    const q = query.toLocaleLowerCase("vi");
    return (await db.transactions.toArray()).filter(
      (t) =>
        !t.deletedAt &&
        [t.title, t.merchant, t.note].some((s) =>
          s?.toLocaleLowerCase("vi").includes(q),
        ),
    );
  },
};
export const accountRepository = {
  create: async (a: Account) => {
    await db.accounts.add(accountSchema.parse(a));
  },
  update: async (a: Account) => {
    await db.accounts.put(accountSchema.parse({ ...a, updatedAt: now() }));
  },
  archive: async (id: string, archived = true) => {
    await db.accounts.update(id, { archived, updatedAt: now() });
  },
  reorder: async (ids: string[]) => {
    await db.transaction("rw", db.accounts, async () => {
      for (const [order, id] of ids.entries())
        await db.accounts.update(id, { order });
    });
  },
};
export const categoryRepository = {
  save: async (c: Category) => {
    await db.categories.put(categorySchema.parse(c));
  },
};
export const budgetRepository = {
  save: async (b: Budget) => {
    const v = budgetSchema.parse(b);
    if (v.categoryId && !(await db.categories.get(v.categoryId)))
      throw new Error("Danh mục không tồn tại.");
    await db.budgets.put(v);
  },
  remove: async (id: string) => {
    await db.budgets.delete(id);
  },
};
export const recurringRepository = {
  save: async (r: RecurringRule) => {
    const rule = recurringSchema.parse(r);
    const t = {
      ...rule.transactionTemplate,
      id: uid(),
      occurredAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    await validateReferences(transactionSchema.parse(t));
    await db.recurring.put(rule);
  },
  remove: async (id: string) => {
    await db.recurring.delete(id);
  },
  confirm: async (id: string, expectedDate: string) => {
    await db.transaction(
      "rw",
      [
        db.recurring,
        db.transactions,
        db.accounts,
        db.categories,
        db.preferences,
      ],
      async () => {
        const r = await db.recurring.get(id);
        if (!r || !r.enabled || r.nextDate !== expectedDate)
          throw new Error("Kỳ này đã được xử lý.");
        if (r.nextDate > dayKey(new Date()))
          throw new Error("Chưa đến ngày ghi nhận.");
        const occurrence = `${id}:${r.nextDate}`;
        if (
          await db.transactions
            .where("recurringOccurrence")
            .equals(occurrence)
            .count()
        )
          throw new Error("Kỳ này đã được ghi nhận.");
        await transactionRepository.create({
          ...r.transactionTemplate,
          id: uid(),
          occurredAt: new Date(`${r.nextDate}T12:00:00`).toISOString(),
          createdAt: now(),
          updatedAt: now(),
          recurringRuleId: id,
          recurringOccurrence: occurrence,
        });
        await db.recurring.update(id, { nextDate: nextOccurrence(r) });
      },
    );
  },
};
export const settingsRepository = {
  save: async (value: Settings) => {
    await db.preferences.put({
      id: "settings",
      value: settingsSchema.parse(value),
    });
  },
};
export async function snapshot() {
  const [accounts, categories, transactions, budgets, recurring, p] =
    await Promise.all([
      db.accounts.orderBy("order").toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.recurring.orderBy("nextDate").toArray(),
      db.preferences.get("settings"),
    ]);
  return {
    accounts,
    categories,
    transactions,
    budgets,
    recurring,
    settings: p?.value ?? settingsSchema.parse({}),
  };
}
export type FinanceData = Awaited<ReturnType<typeof snapshot>>;

import { backupSchema, type Backup } from "../domain/schema";
import { db } from "./schema";
import { snapshot } from "./repositories";
export async function exportBackup(): Promise<Backup> {
  return db.transaction("r", db.tables, async () => ({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ...(await snapshot()),
  }));
}
export function validateBackup(input: unknown): Backup {
  const b = backupSchema.parse(input);
  for (const list of [
    b.accounts,
    b.categories,
    b.transactions,
    b.budgets,
    b.recurring,
  ]) {
    if (new Set(list.map((v) => v.id)).size !== list.length)
      throw new Error("Bản sao có ID bị trùng.");
  }
  const accounts = new Set(b.accounts.map((a) => a.id));
  const categories = new Map(b.categories.map((c) => [c.id, c]));
  for (const t of [
    ...b.transactions,
    ...b.recurring.map((r) => r.transactionTemplate),
  ]) {
    for (const id of [
      "accountId" in t ? t.accountId : undefined,
      "fromAccountId" in t ? t.fromAccountId : undefined,
      "toAccountId" in t ? t.toAccountId : undefined,
    ])
      if (id && !accounts.has(id))
        throw new Error("Bản sao chứa giao dịch thiếu tài khoản.");
    if (
      t.categoryId &&
      (!categories.has(t.categoryId) ||
        categories.get(t.categoryId)?.type !== t.type)
    )
      throw new Error("Bản sao chứa danh mục không hợp lệ.");
  }
  for (const budget of b.budgets)
    if (
      budget.categoryId &&
      categories.get(budget.categoryId)?.type !== "expense"
    )
      throw new Error("Ngân sách có danh mục không hợp lệ.");
  return b;
}
export async function restoreBackup(input: unknown) {
  const b = validateBackup(input);
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.accounts.bulkAdd(b.accounts);
    await db.categories.bulkAdd(b.categories);
    await db.transactions.bulkAdd(b.transactions);
    await db.budgets.bulkAdd(b.budgets);
    await db.recurring.bulkAdd(b.recurring);
    await db.preferences.put({
      id: "settings",
      value: { ...b.settings, aiConsent: false },
    });
  });
}
export async function exportCSV() {
  const d = await snapshot();
  const quote = (s: unknown) =>
    `"${String(s ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""')}"`;
  return (
    "\uFEFF" +
    [
      [
        "Ngày",
        "Loại",
        "Nội dung",
        "Số tiền (VND)",
        "Tài khoản",
        "Tài khoản nhận",
        "Danh mục",
        "Ghi chú",
      ],
      ...d.transactions
        .filter((t) => !t.deletedAt)
        .map((t) => [
          t.occurredAt,
          t.type,
          t.title,
          t.amountMinor,
          d.accounts.find((a) => a.id === (t.accountId ?? t.fromAccountId))
            ?.name,
          d.accounts.find((a) => a.id === t.toAccountId)?.name,
          d.categories.find((c) => c.id === t.categoryId)?.name,
          t.note,
        ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
  );
}

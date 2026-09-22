import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/schema";
import { initialize } from "../db/seed";
import {
  accountRepository,
  transactionRepository,
  recurringRepository,
  uid,
  now,
  snapshot,
} from "../db/repositories";
import {
  balanceService,
  reportService,
  budgetStatus,
  parseMoney,
  nextOccurrence,
} from "../domain/money";
import {
  exportBackup,
  restoreBackup,
  validateBackup,
  exportCSV,
} from "../db/backup";
import type { Account, Transaction, RecurringRule } from "../domain/schema";
let a: Account, b: Account;
const makeTransaction = (patch: Partial<Transaction> = {}): Transaction => ({
  id: uid(),
  type: "income",
  amountMinor: 50000,
  accountId: a.id,
  title: "Giao dịch",
  occurredAt: "2026-09-01T01:00:00Z",
  createdAt: now(),
  updatedAt: now(),
  ...patch,
});
beforeEach(async () => {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
  await initialize();
  a = {
    id: uid(),
    name: "Tiền mặt",
    type: "cash",
    currency: "VND",
    openingBalanceMinor: 100000,
    archived: false,
    order: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  b = { ...a, id: uid(), name: "Ngân hàng", openingBalanceMinor: 200000 };
  await accountRepository.create(a);
  await accountRepository.create(b);
});
describe("Deterministic money", () => {
  it("parses shorthand exactly and rejects fractional đồng/overflow", () => {
    expect(parseMoney("45k")).toBe(45000);
    expect(parseMoney("1.2m")).toBe(1200000);
    expect(parseMoney("0.001k")).toBe(1);
    expect(() => parseMoney("0.1")).toThrow();
    expect(() => parseMoney("9007199254740993")).toThrow();
  });
  it("opening balance + income, expense and signed adjustment", () => {
    const ts = [
      makeTransaction(),
      makeTransaction({ type: "expense", amountMinor: 20000 }),
      makeTransaction({ type: "adjustment", amountMinor: -5000 }),
    ];
    expect(balanceService.getAccountBalance(a, ts)).toBe(125000);
  });
  it("one transfer moves both balances without inflating reports", () => {
    const t = makeTransaction({
      type: "transfer",
      accountId: undefined,
      fromAccountId: a.id,
      toAccountId: b.id,
      amountMinor: 30000,
    });
    expect(balanceService.getAccountBalance(a, [t])).toBe(70000);
    expect(balanceService.getAccountBalance(b, [t])).toBe(230000);
    expect(balanceService.getTotalBalance([a, b], [t])).toBe(300000);
    expect(reportService.getMonthlySummary([t], "2026-09")).toEqual({
      income: 0,
      expense: 0,
      net: 0,
    });
  });
  it("editing, soft deleting and restoring recalculate from history", async () => {
    const t = makeTransaction({ type: "expense", amountMinor: 20000 });
    await transactionRepository.create(t);
    await transactionRepository.update({ ...t, amountMinor: 35000 });
    expect(
      balanceService.getAccountBalance(a, (await snapshot()).transactions),
    ).toBe(65000);
    await transactionRepository.softDelete(t.id);
    expect(
      balanceService.getAccountBalance(a, (await snapshot()).transactions),
    ).toBe(100000);
    await transactionRepository.restore(t.id);
    expect(
      balanceService.getAccountBalance(a, (await snapshot()).transactions),
    ).toBe(65000);
  });
  it("respects local midnight month boundary", () => {
    const ts = [
      makeTransaction({ occurredAt: "2026-08-31T16:59:59Z" }),
      makeTransaction({ occurredAt: "2026-08-31T17:00:00Z" }),
    ];
    expect(reportService.getMonthlySummary(ts, "2026-09").income).toBe(50000);
    expect(reportService.getMonthlySummary(ts, "2026-08").income).toBe(50000);
  });
  it("budget counts only qualifying active expenses", () => {
    const cat = uid();
    const ts = [
      makeTransaction({ type: "expense", categoryId: cat }),
      makeTransaction({ type: "income", categoryId: cat }),
      makeTransaction({ type: "expense", categoryId: uid() }),
      makeTransaction({ type: "expense", categoryId: cat, deletedAt: now() }),
    ];
    expect(
      budgetStatus(
        {
          id: uid(),
          name: "Ăn uống",
          period: "monthly",
          amountMinor: 100000,
          startMonth: "2026-09",
          enabled: true,
          categoryId: cat,
        },
        ts,
        "2026-09",
      ),
    ).toEqual({ spent: 50000, remaining: 50000, percent: 50 });
  });
  it("archived account keeps historical balances and rejects new entry", async () => {
    const t = makeTransaction();
    await transactionRepository.create(t);
    await accountRepository.archive(a.id);
    const data = await snapshot();
    expect(
      balanceService.getTotalBalance(data.accounts, data.transactions),
    ).toBe(350000);
    await expect(
      transactionRepository.create(makeTransaction()),
    ).rejects.toThrow();
    await transactionRepository.update({ ...t, amountMinor: 60000 });
  });
  it("rejects same-account transfers and unknown references", async () => {
    await expect(
      transactionRepository.create(
        makeTransaction({
          type: "transfer",
          fromAccountId: a.id,
          toAccountId: a.id,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      transactionRepository.create(makeTransaction({ accountId: uid() })),
    ).rejects.toThrow();
  });
  it("recurring confirmation is atomic and idempotent for a given due date", async () => {
    const r: RecurringRule = {
      id: uid(),
      frequency: "monthly",
      interval: 1,
      nextDate: "2026-01-31",
      anchorDay: 31,
      enabled: true,
      transactionTemplate: {
        type: "expense",
        amountMinor: 10000,
        accountId: a.id,
        title: "Internet",
      },
    };
    await recurringRepository.save(r);
    const result = await Promise.allSettled([
      recurringRepository.confirm(r.id, r.nextDate),
      recurringRepository.confirm(r.id, r.nextDate),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.transactions.count()).toBe(1);
    expect((await db.recurring.get(r.id))?.nextDate).toBe("2026-02-28");
    expect(nextOccurrence({ ...r, nextDate: "2026-02-28" })).toBe("2026-03-31");
  });
  it("JSON restore preserves balances including deleted records and is all-or-nothing", async () => {
    await transactionRepository.create(makeTransaction());
    const before = await exportBackup();
    await transactionRepository.create(makeTransaction({ type: "expense" }));
    await restoreBackup(before);
    const after = await snapshot();
    expect(
      balanceService.getTotalBalance(after.accounts, after.transactions),
    ).toBe(350000);
    expect(after.transactions).toHaveLength(1);
    expect(() => validateBackup({ ...before, accounts: [] })).toThrow();
    await expect(
      restoreBackup({ ...before, schemaVersion: 999 }),
    ).rejects.toThrow();
    expect(await db.transactions.count()).toBe(1);
  });
  it("first-run seed does not duplicate categories", async () => {
    const n = await db.categories.count();
    await initialize();
    expect(await db.categories.count()).toBe(n);
  });
  it("search includes merchant and note, CSV escapes spreadsheet formulas", async () => {
    await transactionRepository.create(
      makeTransaction({
        title: '=HYPERLINK("bad")',
        note: "Ghi chú bí mật",
        merchant: "Quán quen",
      }),
    );
    expect(await transactionRepository.search("bí mật")).toHaveLength(1);
    expect(await transactionRepository.search("QUÁN")).toHaveLength(1);
    expect(await exportCSV()).toContain("'=HYPERLINK");
  });
});

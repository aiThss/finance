import { describe, it, expect } from "vitest";
import {
  accountBalances,
  activeAccounts,
  balanceService,
  breakdown,
  delta,
  sum,
  summary,
} from "../domain/money";
import { performanceData } from "../db/performance-data";
import { normalizeApiBase } from "../lib/api-base";

describe("single-pass exact money", () => {
  for (const count of [1000, 5000, 10000]) {
    it(`matches the simple reference across ${count} transactions`, () => {
      const { accounts, transactions } = performanceData(count);
      const started = performance.now();
      const reference = accounts.map((a) =>
        sum([
          a.openingBalanceMinor,
          ...transactions.map((t) => delta(t, a.id)),
        ]),
      );
      const referenceMs = performance.now() - started;
      const aggregateStart = performance.now();
      expect([...accountBalances(accounts, transactions).values()]).toEqual(
        reference,
      );
      expect(balanceService.getTotalBalance(accounts, transactions)).toBe(
        sum(reference),
      );
      const aggregateMs = performance.now() - aggregateStart;
      const groups = new Map<string, number[]>();
      for (const t of transactions)
        if (!t.deletedAt && t.type === "expense") {
          const key = t.merchant || "Khác";
          groups.set(key, [...(groups.get(key) ?? []), t.amountMinor]);
        }
      expect(breakdown(transactions, "merchant")).toEqual(
        [...groups]
          .map(([key, values]) => ({ key, amount: sum(values) }))
          .sort((a, b) => b.amount - a.amount),
      );
      expect(
        summary(transactions.filter((t) => t.type === "transfer")),
      ).toEqual({ income: 0, expense: 0, net: 0 });
      console.info(JSON.stringify({ count, referenceMs, aggregateMs }));
    });
  }
  it("excludes archived wallets explicitly, retaining historical transfers", () => {
    const { accounts, transactions } = performanceData(1000);
    const active = activeAccounts(accounts);
    expect(active).toHaveLength(11);
    expect(balanceService.getTotalBalance(active, transactions)).toBe(
      sum(active.map((a) => balanceService.getAccountBalance(a, transactions))),
    );
    expect(balanceService.getTotalBalance(accounts, transactions)).toBe(
      sum([
        balanceService.getTotalBalance(active, transactions),
        balanceService.getAccountBalance(accounts[11], transactions),
      ]),
    );
  });
  it("checks individual balances and category totals for overflow", () => {
    const { accounts, transactions } = performanceData(2);
    const expense = {
      ...transactions[1],
      amountMinor: Number.MAX_SAFE_INTEGER,
      accountId: accounts[0].id,
      type: "expense" as const,
    };
    expect(() =>
      breakdown([expense, { ...expense, id: "extra" }], "categoryId"),
    ).toThrow();
    expect(() =>
      balanceService.getTotalBalance(
        [{ ...accounts[0], openingBalanceMinor: -1 }],
        [expense],
      ),
    ).toThrow();
    expect(
      balanceService.getTotalBalance(accounts, [
        { ...expense, deletedAt: expense.createdAt },
      ]),
    ).toBe(120000000);
  });
});
describe("backend URL policy", () => {
  it("allows web same-origin and normalizes external HTTPS", () => {
    expect(normalizeApiBase(undefined, false)).toBe("");
    expect(normalizeApiBase(" https://example.com/// ", true)).toBe(
      "https://example.com",
    );
  });
  for (const input of [
    undefined,
    "",
    "/api",
    "http://example.com",
    "https://a:b@example.com",
    "https://example.com?key=x",
    "https://example.com#api",
  ])
    it(`rejects unsafe native base ${input}`, () =>
      expect(() => normalizeApiBase(input, true)).toThrow());
});

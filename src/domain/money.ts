import {
  addMonths,
  addWeeks,
  addYears,
  format,
  getDaysInMonth,
  parseISO,
} from "date-fns";
import type { Account, Budget, RecurringRule, Transaction } from "./schema";
export function parseMoney(input: string): number {
  if (input.length > 40) throw new Error("Số tiền quá dài.");
  const match = input
    .trim()
    .toLowerCase()
    .replace(/\s|₫|đ/g, "")
    .match(/^(-?)(\d+(?:[.,]\d+)?)([km]?)$/);
  if (!match) throw new Error("Nhập số nguyên đồng, hoặc dạng 45k / 1.2m.");
  const [, sign, value, suffix] = match;
  const parts = value.replace(",", ".").split(".");
  const scale = suffix === "m" ? 1000000 : suffix === "k" ? 1000 : 1;
  const denominator = 10 ** (parts[1]?.length ?? 0);
  const numerator = BigInt(parts.join("")) * BigInt(scale);
  if (numerator % BigInt(denominator) !== 0n)
    throw new Error("Số tiền phải là số nguyên đồng.");
  const n = Number(numerator / BigInt(denominator)) * (sign === "-" ? -1 : 1);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 1e12)
    throw new Error("Số tiền vượt giới hạn 1.000 tỷ đồng.");
  return n;
}
export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
export const monthKey = (date: string | Date) =>
  format(typeof date === "string" ? parseISO(date) : date, "yyyy-MM");
export const dayKey = (date: string | Date) =>
  format(typeof date === "string" ? parseISO(date) : date, "yyyy-MM-dd");
export const active = (transactions: Transaction[]) =>
  transactions.filter((t) => !t.deletedAt);
export function sum(values: number[]): number {
  const n = values.reduce((a, b) => a + BigInt(b), 0n);
  if (
    n > BigInt(Number.MAX_SAFE_INTEGER) ||
    n < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw new Error("Tổng số tiền vượt giới hạn tính toán an toàn.");
  return Number(n);
}
export function delta(t: Transaction, id: string): number {
  if (t.deletedAt) return 0;
  if (t.type === "transfer")
    return t.toAccountId === id
      ? t.amountMinor
      : t.fromAccountId === id
        ? -t.amountMinor
        : 0;
  if (t.accountId !== id) return 0;
  return t.type === "expense" ? -t.amountMinor : t.amountMinor;
}
export const balanceService = {
  getAccountBalance: (a: Account, ts: Transaction[]) =>
    sum([a.openingBalanceMinor, ...ts.map((t) => delta(t, a.id))]),
  getTotalBalance: (as: Account[], ts: Transaction[]) =>
    sum(as.map((a) => balanceService.getAccountBalance(a, ts))),
};
export function summary(ts: Transaction[]) {
  const items = active(ts);
  const income = sum(
    items.filter((t) => t.type === "income").map((t) => t.amountMinor),
  );
  const expense = sum(
    items.filter((t) => t.type === "expense").map((t) => t.amountMinor),
  );
  return { income, expense, net: sum([income, -expense]) };
}
export const reportService = {
  getMonthlySummary: (ts: Transaction[], month: string) =>
    summary(ts.filter((t) => monthKey(t.occurredAt) === month)),
  getCategoryBreakdown: (ts: Transaction[]) => breakdown(ts, "categoryId"),
};
export function breakdown(ts: Transaction[], field: "categoryId" | "merchant") {
  const groups = new Map<string, number[]>();
  for (const t of active(ts).filter((t) => t.type === "expense")) {
    const key = t[field] || "Khác";
    groups.set(key, [...(groups.get(key) ?? []), t.amountMinor]);
  }
  return [...groups]
    .map(([key, values]) => ({ key, amount: sum(values) }))
    .sort((a, b) => b.amount - a.amount);
}
export function budgetStatus(b: Budget, ts: Transaction[], month: string) {
  const spent =
    month < b.startMonth
      ? 0
      : sum(
          active(ts)
            .filter(
              (t) =>
                t.type === "expense" &&
                monthKey(t.occurredAt) === month &&
                (!b.categoryId || t.categoryId === b.categoryId),
            )
            .map((t) => t.amountMinor),
        );
  return {
    spent,
    remaining: b.amountMinor - spent,
    percent: (spent / b.amountMinor) * 100,
  };
}
export function nextOccurrence(rule: RecurringRule): string {
  const d = parseISO(rule.nextDate);
  const next =
    rule.frequency === "weekly"
      ? addWeeks(d, rule.interval)
      : rule.frequency === "yearly"
        ? addYears(d, rule.interval)
        : addMonths(d, rule.interval);
  if (rule.frequency !== "weekly")
    next.setDate(Math.min(rule.anchorDay ?? d.getDate(), getDaysInMonth(next)));
  return dayKey(next);
}

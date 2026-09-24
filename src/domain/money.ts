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
  let cleaned = input.trim().toLowerCase().replace(/\s|₫|đ/g, "");
  // Hỗ trợ phân cách hàng nghìn tiếng Việt (1.000, 10.000, 100.000, 1.000.000) khi không có hậu tố k/m
  if (/^-?\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }
  const match = cleaned.match(/^(-?)(\d+(?:[.,]\d+)?)([km]?)$/);
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

export function formatAmountInput(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Nếu người dùng nhập tắt (k, m, tr...) thì giữ nguyên định dạng gõ tắt
  if (/[a-zA-Z]/i.test(trimmed)) {
    return trimmed;
  }
  const isNegative = trimmed.startsWith("-");
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return isNegative ? "-" : "";
  // Xóa số 0 thừa ở đầu nếu chuỗi dài hơn 1 chữ số
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  // Định dạng dấu chấm phân cách hàng nghìn
  const formatted = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return isNegative ? `-${formatted}` : formatted;
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
  return safeMoney(values.reduce((a, b) => a + BigInt(b), 0n));
}
export function safeMoney(n: bigint): number {
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
// History is authoritative. Keep intermediate totals exact, checking each final
// account balance as well as the combined total (even if accounts cancel out).
export function accountBalances(
  accounts: Account[],
  transactions: Transaction[],
) {
  const deltas = new Map<string, bigint>();
  const add = (id: string | undefined, amount: bigint) => {
    if (id) deltas.set(id, (deltas.get(id) ?? 0n) + amount);
  };
  for (const t of transactions) {
    if (t.deletedAt) continue;
    const amount = BigInt(t.amountMinor);
    if (t.type === "transfer") {
      add(t.fromAccountId, -amount);
      add(t.toAccountId, amount);
    } else add(t.accountId, t.type === "expense" ? -amount : amount);
  }
  return new Map(
    accounts.map((a) => [
      a.id,
      safeMoney(BigInt(a.openingBalanceMinor) + (deltas.get(a.id) ?? 0n)),
    ]),
  );
}
export const activeAccounts = (accounts: Account[]) =>
  accounts.filter((a) => !a.archived);
export const balanceService = {
  getAccountBalance: (a: Account, ts: Transaction[]) =>
    sum([a.openingBalanceMinor, ...ts.map((t) => delta(t, a.id))]),
  getTotalBalance: (as: Account[], ts: Transaction[]) =>
    sum([...accountBalances(as, ts).values()]),
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
  const groups = new Map<string, bigint>();
  for (const t of ts) {
    if (t.deletedAt || t.type !== "expense") continue;
    const key = t[field] || "Khác";
    groups.set(key, (groups.get(key) ?? 0n) + BigInt(t.amountMinor));
  }
  return [...groups]
    .map(([key, value]) => ({ key, amount: safeMoney(value) }))
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

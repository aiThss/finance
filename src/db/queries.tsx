import { createContext, useContext, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./schema";
import { settingsSchema } from "../domain/schema";
import type { FinanceData } from "./repositories";

const empty: FinanceData = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  recurring: [],
  settings: settingsSchema.parse({}),
};
export const readSettings = async () =>
  (await db.preferences.get("settings"))?.value ?? empty.settings;
export function useSettings() {
  return useLiveQuery(readSettings, [], empty.settings);
}
export function useAccounts(enabled = true) {
  return useLiveQuery(
    () => (enabled ? db.accounts.orderBy("order").toArray() : empty.accounts),
    [enabled],
  );
}
export function useCategories(enabled = true) {
  return useLiveQuery(
    () => (enabled ? db.categories.toArray() : empty.categories),
    [enabled],
  );
}
export function useTransactions(enabled = true, recentLimit?: number) {
  return useLiveQuery(
    () =>
      !enabled
        ? empty.transactions
        : recentLimit
          ? db.transactions
              .orderBy("occurredAt")
              .reverse()
              .filter((t) => !t.deletedAt)
              .limit(recentLimit)
              .toArray()
          : db.transactions.orderBy("occurredAt").reverse().toArray(),
    [enabled, recentLimit],
  );
}
export function useTransactionsForRange(
  from: string,
  to: string,
  enabled = true,
) {
  return useLiveQuery(
    () =>
      enabled
        ? db.transactions
            .where("occurredAt")
            .between(from, to, true, false)
            .filter((t) => !t.deletedAt)
            .toArray()
        : empty.transactions,
    [from, to, enabled],
  );
}
export function useBudgets(enabled = true) {
  return useLiveQuery(
    () => (enabled ? db.budgets.toArray() : empty.budgets),
    [enabled],
  );
}
export function useRecurring(enabled = true) {
  return useLiveQuery(
    () =>
      enabled ? db.recurring.orderBy("nextDate").toArray() : empty.recurring,
    [enabled],
  );
}
const FinanceContext = createContext<FinanceData | null>(null);
const PrivacyContext = createContext(true);
export const usePrivacy = () => useContext(PrivacyContext);
export function PrivacyProvider({ children }: { children: ReactNode }) {
  // One preference observer for all Money nodes. Mask until it resolves so a
  // saved privacy preference never flashes a balance during route mounting.
  const privacy = useLiveQuery(
    async () => (await readSettings()).privacy,
    [],
    true,
  );
  return (
    <PrivacyContext.Provider value={privacy}>
      {children}
    </PrivacyContext.Provider>
  );
}
export function useFinanceData() {
  const data = useContext(FinanceContext);
  if (!data) throw new Error("Finance data scope unavailable");
  return data;
}
// Each table has its own observer: preferences never trigger a history reload.
// Scopes are mounted with the route, not in the app shell.
export function FinanceScope({
  tables,
  recentLimit,
  children,
}: {
  tables: readonly (keyof FinanceData)[];
  recentLimit?: number;
  children: ReactNode;
}) {
  const accounts = useAccounts(tables.includes("accounts"));
  const categories = useCategories(tables.includes("categories"));
  const transactions = useTransactions(
    tables.includes("transactions"),
    recentLimit,
  );
  const budgets = useBudgets(tables.includes("budgets"));
  const recurring = useRecurring(tables.includes("recurring"));
  const settings = useLiveQuery(
    () => (tables.includes("settings") ? readSettings() : empty.settings),
    [tables.includes("settings")],
  );
  if (
    !accounts ||
    !categories ||
    !transactions ||
    !budgets ||
    !recurring ||
    !settings
  )
    return <p role="status">Đang mở…</p>;
  return (
    <FinanceContext.Provider
      value={{
        accounts,
        categories,
        transactions,
        budgets,
        recurring,
        settings,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

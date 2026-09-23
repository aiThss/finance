import { createContext, useContext } from "react";
import { useFinanceData } from "../db/queries";
import type { Transaction } from "../domain/schema";
export type Draft = Partial<Transaction>;
export interface AppContextValue {
  openTransaction: (draft?: Draft) => void;
  notify: (text: string, action?: () => void, label?: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useAppActions() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("App context unavailable");
  return ctx;
}
export function useApp() {
  const actions = useAppActions();
  const data = useFinanceData();
  return { ...actions, data };
}

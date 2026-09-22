import { createContext, useContext } from "react";
import type { FinanceData } from "../db/repositories";
import type { Transaction } from "../domain/schema";
export type Draft = Partial<Transaction>;
export interface AppContextValue {
  data: FinanceData;
  openTransaction: (draft?: Draft) => void;
  notify: (text: string, action?: () => void, label?: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("App context unavailable");
  return ctx;
}

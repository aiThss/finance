import Dexie, { type Table } from "dexie";
import { migrateToV2 } from "./migrations/v2";
import type {
  Account,
  Category,
  Transaction,
  Budget,
  RecurringRule,
  Settings,
} from "../domain/schema";
export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  recurring!: Table<RecurringRule, string>;
  preferences!: Table<{ id: string; value: Settings }, string>;
  constructor(name = "tui-nho-finance") {
    super(name);
    this.version(1).stores({
      accounts: "id,order",
      categories: "id,type",
      transactions:
        "id,occurredAt,accountId,categoryId,recurringRuleId,recurringOccurrence",
      budgets: "id,startMonth",
      recurring: "id,nextDate",
      preferences: "id",
    });
    this.version(2).stores({}).upgrade(migrateToV2);
  }
}
export const db = new FinanceDatabase();

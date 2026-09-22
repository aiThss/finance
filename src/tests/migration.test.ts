import Dexie from "dexie";
import { expect, it } from "vitest";
import { FinanceDatabase } from "../db/schema";
it("upgrades v1 metadata without changing financial history", async () => {
  const name = "migration-test";
  const old = new Dexie(name);
  old
    .version(1)
    .stores({
      accounts: "id,order",
      categories: "id,type",
      transactions:
        "id,occurredAt,accountId,categoryId,recurringRuleId,recurringOccurrence",
      budgets: "id,startMonth",
      recurring: "id,nextDate",
      preferences: "id",
    });
  await old
    .table("accounts")
    .put({ id: "account", openingBalanceMinor: 45000 });
  await old.table("recurring").put({ id: "rule", nextDate: "2026-01-31" });
  old.close();
  const updated = new FinanceDatabase(name);
  await updated.open();
  expect((await updated.accounts.get("account"))?.openingBalanceMinor).toBe(
    45000,
  );
  expect((await updated.accounts.get("account"))?.order).toBe(0);
  expect((await updated.recurring.get("rule"))?.anchorDay).toBe(31);
  await updated.delete();
});

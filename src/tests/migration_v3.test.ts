import Dexie from "dexie";
import { expect, it } from "vitest";
import { FinanceDatabase } from "../db/schema";
import { DEFAULT_JEWEL_MAP } from "../db/migrations/v3";

it("upgrades v2 legacy category colors to 16 jewel palette and preserves custom colors", async () => {
  const name = "migration-v3-test";
  const old = new Dexie(name);
  old.version(1).stores({
    accounts: "id,order",
    categories: "id,type",
    transactions:
      "id,occurredAt,accountId,categoryId,recurringRuleId,recurringOccurrence",
    budgets: "id,startMonth",
    recurring: "id,nextDate",
    preferences: "id",
  });
  old.version(2).stores({});

  await old.table("categories").bulkAdd([
    {
      id: "cat-1",
      name: "Ăn uống",
      type: "expense",
      icon: "utensils",
      color: "#c2c9b7",
      archived: false,
    },
    {
      id: "cat-2",
      name: "Lương",
      type: "income",
      icon: "briefcase",
      color: "#9ac5b0",
      archived: false,
    },
    {
      id: "cat-3",
      name: "Cà phê",
      type: "expense",
      icon: "coffee",
      color: "#C2C9B7", // uppercase test
      archived: false,
    },
    {
      id: "cat-4",
      name: "Sở thích cá nhân",
      type: "expense",
      icon: "heart",
      color: "#990000", // custom user-chosen color
      archived: false,
    },
    {
      id: "cat-5",
      name: "Khoản lạ",
      type: "expense",
      icon: "wallet",
      color: "#c2c9b7", // custom category with legacy default color
      archived: false,
    },
  ]);
  old.close();

  const updated = new FinanceDatabase(name);
  await updated.open();

  const cat1 = await updated.categories.get("cat-1");
  const cat2 = await updated.categories.get("cat-2");
  const cat3 = await updated.categories.get("cat-3");
  const cat4 = await updated.categories.get("cat-4");
  const cat5 = await updated.categories.get("cat-5");

  expect(cat1?.color).toBe(DEFAULT_JEWEL_MAP["Ăn uống"]);
  expect(cat1?.color).toBe("#F97316");

  expect(cat2?.color).toBe(DEFAULT_JEWEL_MAP["Lương"]);
  expect(cat2?.color).toBe("#10B981");

  expect(cat3?.color).toBe(DEFAULT_JEWEL_MAP["Cà phê"]);
  expect(cat3?.color).toBe("#D97706");

  // Custom user color must be preserved
  expect(cat4?.color).toBe("#990000");

  // Unknown category with legacy color gets mapped to sensible fallback
  expect(cat5?.color).toBe("#64748B");

  await updated.delete();
});

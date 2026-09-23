import type { Account, Category, Transaction } from "../domain/schema";
// Deterministic, synthetic fixtures for local development and performance tests.
export function performanceData(count: number, categories: Category[] = []) {
  const date = new Date();
  const stamp = date.toISOString();
  const accounts: Account[] = Array.from({ length: 12 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: `Ví thử ${i + 1}`,
    type: "cash",
    currency: "VND",
    openingBalanceMinor: 10000000,
    archived: i === 11,
    order: i,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const transactions: Transaction[] = Array.from({ length: count }, (_, i) => {
    const type =
      i % 9 === 0
        ? "transfer"
        : i % 7 === 0
          ? "income"
          : i % 13 === 0
            ? "adjustment"
            : "expense";
    const category = categories.find((c) => c.type === type && !c.archived);
    return {
      id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      type,
      amountMinor: ((i % 13) + 1) * (type === "adjustment" ? -1000 : 1000),
      ...(type === "transfer"
        ? {
            fromAccountId: accounts[i % 12].id,
            toAccountId: accounts[(i + 1) % 12].id,
          }
        : { accountId: accounts[i % 12].id, categoryId: category?.id }),
      title: `Giao dịch thử ${i + 1}`,
      merchant: `Cửa hàng ${i % 20}`,
      occurredAt: new Date(
        date.getTime() - (i % 90) * 86400000 - i * 1000,
      ).toISOString(),
      createdAt: stamp,
      updatedAt: stamp,
      ...(i % 97 === 0 ? { deletedAt: stamp } : {}),
    };
  });
  return { accounts, transactions };
}

import { subDays } from "date-fns";
import {
  accountRepository,
  transactionRepository,
  uid,
  now,
} from "./repositories";
import { db } from "./schema";
export async function seedDemo() {
  if (!import.meta.env.DEV)
    throw new Error("Demo chỉ dùng trong môi trường phát triển.");
  if (await db.accounts.count())
    throw new Error(
      "Chỉ tạo demo khi chưa có tài khoản để tránh trộn dữ liệu.",
    );
  const cash = uid(),
    bank = uid();
  for (const [id, name, type, opening] of [
    [cash, "Tiền mặt", "cash", 1500000],
    [bank, "Tài khoản ngân hàng", "bank", 12500000],
  ] as const)
    await accountRepository.create({
      id,
      name,
      type,
      currency: "VND",
      openingBalanceMinor: opening,
      order: 0,
      archived: false,
      createdAt: now(),
      updatedAt: now(),
    });
  const cats = await db.categories.toArray();
  for (let i = 0; i < 100; i++) {
    const income = i % 28 === 0;
    const c = cats.find(
      (c) => c.name === (income ? "Lương" : i % 3 === 0 ? "Cà phê" : "Ăn uống"),
    )!;
    await transactionRepository.create({
      id: uid(),
      type: income ? "income" : "expense",
      amountMinor: income ? 18000000 : ((i % 7) + 1) * 15000,
      accountId: income ? bank : cash,
      categoryId: c.id,
      title: income ? "Lương tháng" : i % 3 === 0 ? "Cà phê sáng" : "Bữa trưa",
      merchant: income ? "Công ty" : i % 3 === 0 ? "Quán quen" : "Bếp nhà",
      occurredAt: subDays(new Date(), i).toISOString(),
      createdAt: now(),
      updatedAt: now(),
    });
  }
}

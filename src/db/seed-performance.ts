import { db } from "./schema";
import { performanceData } from "./performance-data";
export async function seedPerformance(count: 1000 | 5000 | 10000) {
  if (!import.meta.env.DEV)
    throw new Error("Chỉ dùng trong môi trường phát triển.");
  await db.transaction(
    "rw",
    [db.accounts, db.transactions, db.categories],
    async () => {
      if ((await db.accounts.count()) || (await db.transactions.count()))
        throw new Error(
          "Chỉ tạo dữ liệu thử trong bộ nhớ trống để bảo vệ dữ liệu của bạn.",
        );
      const data = performanceData(count, await db.categories.toArray());
      await db.accounts.bulkAdd(data.accounts);
      await db.transactions.bulkAdd(data.transactions);
    },
  );
}

import type { Transaction as DexieTransaction } from "dexie";
import type { Account, RecurringRule } from "../../domain/schema";
// Preserve existing financial records; only add metadata introduced in v2.
export async function migrateToV2(tx: DexieTransaction) {
  await tx
    .table<Account>("accounts")
    .toCollection()
    .modify((a) => {
      if (!Number.isInteger(a.order)) a.order = 0;
    });
  await tx
    .table<RecurringRule>("recurring")
    .toCollection()
    .modify((r) => {
      r.anchorDay ??= Number(r.nextDate.slice(-2));
    });
}

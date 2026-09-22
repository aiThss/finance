import type { Transaction } from "../../domain/schema";
import { useApp } from "../../app/context";
import { Money } from "../ui/Common";
import { CategoryIcon } from "../ui/Icon";
import { format } from "date-fns";
export function TransactionRows({ items }: { items: Transaction[] }) {
  const { data, openTransaction } = useApp();
  return (
    <div className="ledger">
      {items.map((t) => {
        const category = data.categories.find((c) => c.id === t.categoryId);
        const account = data.accounts.find(
          (a) => a.id === (t.accountId ?? t.fromAccountId),
        );
        return (
          <button
            key={t.id}
            className="transaction-row"
            onClick={() => openTransaction(t)}
          >
            <span className={`category-icon ${t.type}`}>
              <CategoryIcon
                name={t.type === "transfer" ? "transfer" : category?.icon}
              />
            </span>
            <span className="transaction-copy">
              <strong>{t.title}</strong>
              <small>
                {account?.name ?? "Tài khoản"} ·{" "}
                {format(new Date(t.occurredAt), "HH:mm")}
                {t.type === "transfer" &&
                  ` → ${data.accounts.find((a) => a.id === t.toAccountId)?.name}`}
              </small>
            </span>
            <Money
              className={t.type}
              value={t.type === "expense" ? -t.amountMinor : t.amountMinor}
              sign={t.type === "income"}
            />
          </button>
        );
      })}
    </div>
  );
}

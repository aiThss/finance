import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, BookCheck } from "lucide-react";
import { useApp } from "../../app/context";
import { ErrorText, Money, message } from "../../components/ui/Common";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
import { dailyCloseKey, dailyCloseRepository } from "../../db/repositories";
import {
  accountBalances,
  activeAccounts,
  dayKey,
  formatAmountInput,
  parseMoney,
  sum,
} from "../../domain/money";

interface CloseValues {
  ending: string;
  expense: string;
}

export function DailyCloseSheet({ onClose }: { onClose: () => void }) {
  const { data, notify } = useApp();
  const date = dayKey(new Date());
  const accounts = useMemo(
    () => activeAccounts(data.accounts),
    [data.accounts],
  );
  const { baseBalances, initialValues } = useMemo(() => {
    const closeKeys = new Set(
      accounts.map((account) => dailyCloseKey(date, account.id)),
    );
    const baseTransactions = data.transactions.filter(
      (transaction) =>
        !transaction.dailyCloseKey || !closeKeys.has(transaction.dailyCloseKey),
    );
    const baseBalances = accountBalances(accounts, baseTransactions);
    const currentBalances = accountBalances(accounts, data.transactions);
    const initialValues = Object.fromEntries(
      accounts.map((account) => {
        const key = dailyCloseKey(date, account.id);
        const expense = data.transactions
          .filter(
            (transaction) =>
              !transaction.deletedAt &&
              transaction.dailyCloseKey === key &&
              transaction.dailyCloseRole === "expense",
          )
          .reduce((total, transaction) => total + transaction.amountMinor, 0);
        return [
          account.id,
          {
            ending: formatAmountInput(
              String(currentBalances.get(account.id) ?? 0),
            ),
            expense: expense ? formatAmountInput(String(expense)) : "",
          },
        ];
      }),
    ) as Record<string, CloseValues>;
    return { baseBalances, initialValues };
  }, [accounts, data.transactions, date]);
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clean, setClean] = useState(false);
  const dirty =
    !clean && JSON.stringify(values) !== JSON.stringify(initialValues);

  const parsed = useMemo(() => {
    try {
      const entries = accounts.map((account) => {
        const value = values[account.id];
        const endingBalanceMinor = parseMoney(value?.ending ?? "");
        const expenseMinor = value?.expense ? parseMoney(value.expense) : 0;
        if (expenseMinor < 0) throw new Error("Tổng chi không được âm.");
        const inferredIncomeMinor =
          endingBalanceMinor -
          (baseBalances.get(account.id) ?? 0) +
          expenseMinor;
        return {
          accountId: account.id,
          endingBalanceMinor,
          expenseMinor,
          inferredIncomeMinor,
        };
      });
      return { entries, error: "" };
    } catch (cause) {
      return { entries: [], error: message(cause) };
    }
  }, [accounts, baseBalances, values]);

  const update = (accountId: string, field: keyof CloseValues, input: string) =>
    setValues((current) => ({
      ...current,
      [accountId]: {
        ...current[accountId],
        [field]: formatAmountInput(input),
      },
    }));

  async function save() {
    setError("");
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    try {
      await dailyCloseRepository.saveToday(parsed.entries);
      notify("Đã chốt số dư và thu chi hôm nay");
      setClean(true);
      dismissSheet();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const totalExpense = parsed.entries.length
    ? sum(parsed.entries.map((entry) => entry.expenseMinor))
    : 0;
  const totalIncome = parsed.entries.length
    ? sum(parsed.entries.map((entry) => Math.max(0, entry.inferredIncomeMinor)))
    : 0;
  const totalNegativeVariance = parsed.entries.length
    ? sum(
        parsed.entries.map((entry) =>
          Math.abs(Math.min(0, entry.inferredIncomeMinor)),
        ),
      )
    : 0;

  return (
    <Sheet title="Chốt ngày" onClose={onClose} dirty={dirty}>
      {!accounts.length ? (
        <p className="muted">
          Hãy tạo ít nhất một tài khoản trước khi chốt ngày.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="daily-close-intro">
            <BookCheck size={21} />
            <p>
              Nhập số dư bạn đang thấy và tổng chi chưa ghi. Heo Nhỏ sẽ tự suy
              ra doanh thu để sổ khớp đúng số tiền thực tế.
            </p>
          </div>
          <div className="daily-close-transfer-note" role="note">
            <ArrowLeftRight size={17} />
            <p>
              <strong>Cần làm trước:</strong> Ghi các khoản chuyển tiền giữa ví
              để không bị tính nhầm thành doanh thu.
            </p>
          </div>
          <div className="daily-close-list">
            {accounts.map((account) => {
              const entry = parsed.entries.find(
                (item) => item.accountId === account.id,
              );
              const inferred = entry?.inferredIncomeMinor;
              return (
                <section className="daily-close-account" key={account.id}>
                  <div className="daily-close-account-heading">
                    <h3>{account.name}</h3>
                    <span>
                      Sổ hiện tại{" "}
                      <Money value={baseBalances.get(account.id) ?? 0} />
                    </span>
                  </div>
                  <div className="daily-close-fields">
                    <label>
                      Số dư thực tế cuối ngày
                      <input
                        aria-label={`Số dư cuối ngày · ${account.name}`}
                        inputMode="decimal"
                        autoComplete="off"
                        value={values[account.id]?.ending ?? ""}
                        onChange={(event) =>
                          update(account.id, "ending", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Tổng chi chưa ghi
                      <input
                        aria-label={`Tổng chi chưa ghi · ${account.name}`}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0"
                        value={values[account.id]?.expense ?? ""}
                        onChange={(event) =>
                          update(account.id, "expense", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  {typeof inferred === "number" && (
                    <div
                      className={`daily-close-result ${inferred < 0 ? "is-negative" : ""}`}
                      role="status"
                      aria-live="polite"
                    >
                      {inferred < 0 && <AlertTriangle size={16} />}
                      <span>
                        {inferred < 0
                          ? "Chênh lệch giảm chưa giải thích"
                          : "Doanh thu suy ra"}
                      </span>
                      <Money
                        value={inferred}
                        sign={inferred > 0}
                        className={inferred < 0 ? "expense" : "income"}
                      />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <ErrorText error={error} />
          <footer className="sheet-footer daily-close-footer">
            <div className="daily-close-summary" aria-live="polite">
              <span>
                Tổng chi <Money value={totalExpense} className="expense" />
              </span>
              <span>
                Tổng thu suy ra <Money value={totalIncome} className="income" />
              </span>
              {totalNegativeVariance > 0 && (
                <span>
                  Chênh lệch giảm
                  <Money value={-totalNegativeVariance} className="expense" />
                </span>
              )}
            </div>
            <button className="primary" disabled={busy} type="submit">
              <BookCheck size={18} />
              {busy ? "Đang đối chiếu…" : "Chốt và khớp số dư"}
            </button>
          </footer>
        </form>
      )}
    </Sheet>
  );
}

import { SelectField } from "../../components/ui/SelectField";
import { DateTimePickerField } from "../../components/ui/DateTimePickerField";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useApp, type Draft } from "../../app/context";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
import { ErrorText, message } from "../../components/ui/Common";
import { CategoryIcon } from "../../components/ui/Icon";
import { now, uid, transactionRepository } from "../../db/repositories";
import { parseMoney, formatAmountInput } from "../../domain/money";
import { vi } from "../../locales/vi";
import type { Transaction } from "../../domain/schema";
interface FormValues {
  amount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  title: string;
  merchant: string;
  note: string;
  date: string;
}
const everydayCategories = [
  "Ăn uống",
  "Cà phê",
  "Di chuyển",
  "Mua sắm",
  "Gia đình",
  "Tiền nhà",
];
const categoryPriority = (name: string) => {
  const index = everydayCategories.indexOf(name);
  return index < 0 ? everydayCategories.length : index;
};
export function TransactionSheet({
  draft,
  onClose,
}: {
  draft: Draft;
  onClose: () => void;
}) {
  const { data, notify } = useApp();
  const [type, setType] = useState<Transaction["type"]>(
    draft.type ?? "expense",
  );
  const [allCategories, setAllCategories] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clean, setClean] = useState(false);
  const accounts = data.accounts.filter(
    (a) =>
      !a.archived ||
      [draft.accountId, draft.fromAccountId, draft.toAccountId].includes(a.id),
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      amount: draft.amountMinor?.toString() ?? "",
      accountId:
        draft.accountId ??
        draft.fromAccountId ??
        accounts.find((a) => a.id === data.settings.lastAccountId)?.id ??
        accounts[0]?.id ??
        "",
      toAccountId: draft.toAccountId ?? accounts[1]?.id ?? "",
      categoryId: draft.categoryId ?? "",
      title: draft.title ?? "",
      merchant: draft.merchant ?? "",
      note: draft.note ?? "",
      date: format(
        new Date(draft.occurredAt ?? Date.now()),
        "yyyy-MM-dd'T'HH:mm",
      ),
    },
  });

  useEffect(() => {
    register("date", { required: true });
  }, [register]);
  const categoryFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.transactions)
      if (!t.deletedAt && t.categoryId)
        counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    return counts;
  }, [data.transactions]);
  const categories = data.categories
    .filter(
      (c) => c.type === type && (!c.archived || c.id === draft.categoryId),
    )
    .sort(
      (a, b) =>
        (categoryFrequency.get(b.id) ?? 0) -
          (categoryFrequency.get(a.id) ?? 0) ||
        categoryPriority(a.name) - categoryPriority(b.name) ||
        a.name.localeCompare(b.name, "vi"),
    );
  const categoryId = watch("categoryId");

  const currentAmount = watch("amount") || "";

  const suggestions = useMemo(() => {
    const trimmed = currentAmount.trim();
    if (!trimmed || trimmed === "0") {
      return [10000, 50000, 100000];
    }
    const digitsOnly = trimmed.replace(/\D/g, "");
    if (!digitsOnly) return [10000, 50000, 100000];

    const n = parseInt(digitsOnly, 10);
    if (isNaN(n) || n <= 0) return [10000, 50000, 100000];

    if (n < 1000) {
      return [n * 1000, n * 10000, n * 100000];
    }
    if (n < 1000000000) {
      return [n, n * 10, n * 100];
    }
    return [n];
  }, [currentAmount]);

  const selectSuggestion = (amt: number) => {
    const formatted = formatAmountInput(String(amt));
    setValue("amount", formatted, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const clearAmount = () => {
    setValue("amount", "", { shouldDirty: true, shouldValidate: true });
    setFocus("amount");
  };

  async function save(v: FormValues, another = false) {
    setError("");
    setBusy(true);
    try {
      const amountMinor = parseMoney(v.amount);
      const category = categories.find((c) => c.id === v.categoryId);
      const t: Transaction = {
        id: draft.id ?? uid(),
        createdAt: draft.createdAt ?? now(),
        updatedAt: now(),
        type,
        amountMinor,
        title: v.title.trim() || category?.name || vi.types[type],
        merchant: v.merchant || undefined,
        note: v.note || undefined,
        occurredAt: new Date(v.date).toISOString(),
        ...(type === "transfer"
          ? { fromAccountId: v.accountId, toAccountId: v.toAccountId }
          : {
              accountId: v.accountId,
              categoryId:
                type === "adjustment" ? undefined : v.categoryId || undefined,
            }),
        recurringRuleId: draft.recurringRuleId,
        recurringOccurrence: draft.recurringOccurrence,
      };
      await (draft.id
        ? transactionRepository.update(t)
        : transactionRepository.create(t));
      notify(draft.id ? "Đã cập nhật giao dịch" : "Đã lưu giao dịch");
      setClean(true);
      if (another) {
        reset({
          ...v,
          amount: "",
          title: "",
          merchant: "",
          note: "",
          date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        });
        setClean(false);
        setFocus("amount");
      } else dismissSheet();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await transactionRepository.softDelete(draft.id!);
      notify(
        "Đã chuyển vào thùng rác",
        () => {
          void transactionRepository
            .restore(draft.id!)
            .catch((e) => notify(message(e)));
        },
        "Hoàn tác",
      );
      setClean(true);
      dismissSheet();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={draft.id ? "Chi tiết giao dịch" : "Ghi một khoản mới"}
      onClose={onClose}
      dirty={
        !clean &&
        (isDirty ||
          Boolean(
            currentAmount &&
              currentAmount !== (draft.amountMinor?.toString() ?? ""),
          ) ||
          type !== (draft.type ?? "expense"))
      }
    >
      {!accounts.length ? (
        <div className="empty">
          <h3>Chưa có tài khoản</h3>
          <p>Thêm ví tiền mặt, ngân hàng hoặc ví điện tử để ghi nhận giao dịch.</p>
          <Link className="primary" to="/accounts" onClick={onClose}>
            Thêm tài khoản
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => save(v))}>
          <div className="segmented">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={type === t}
                className={type === t ? "selected" : ""}
                onClick={() => {
                  setType(t);
                  setValue("categoryId", "");
                }}
              >
                {vi.types[t]}
              </button>
            ))}
          </div>
          <div className="amount-field">
            <div className="amount-header">
              <label htmlFor="amount-input">Số tiền</label>
            </div>
            <div className="amount-box">
              <input
                id="amount-input"
                aria-label="Số tiền"
                inputMode="decimal"
                placeholder="0"
                autoComplete="off"
                {...register("amount", {
                  required: true,
                  onChange: (e) => {
                    const formatted = formatAmountInput(e.target.value);
                    setValue("amount", formatted, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  },
                })}
              />
              {currentAmount && (
                <button
                  type="button"
                  className="amount-clear-btn"
                  onClick={clearAmount}
                  aria-label="Xóa trắng"
                  title="Xóa trắng"
                >
                  <X size={16} />
                </button>
              )}
              <span className="amount-unit">đ</span>
            </div>
            <div
              className="quick-suggestions-grid"
              role="group"
              aria-label="Gợi ý số nhanh"
            >
              {suggestions.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  className="quick-suggest-btn"
                  onClick={() => selectSuggestion(amt)}
                >
                  {formatAmountInput(String(amt))} đ
                </button>
              ))}
            </div>
          </div>
          <div className="form-grid">
            <label>
              {type === "transfer" ? "Từ tài khoản" : "Tài khoản"}
              <SelectField
                {...register("accountId")}
                aria-label={type === "transfer" ? "Từ tài khoản" : "Tài khoản"}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </SelectField>
            </label>
            {type === "transfer" && (
              <label>
                Đến tài khoản
                <SelectField
                  {...register("toAccountId")}
                  aria-label="Đến tài khoản"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectField>
              </label>
            )}
          </div>
          {type !== "transfer" && type !== "adjustment" && (
            <fieldset>
              <legend>Danh mục</legend>
              <div className="category-picker">
                {categories
                  .filter(
                    (c, i) => allCategories || i < 6 || c.id === categoryId,
                  )
                  .map((c) => (
                    <button
                      className={categoryId === c.id ? "chosen" : ""}
                      type="button"
                      key={c.id}
                      aria-pressed={categoryId === c.id}
                      style={
                        {
                          "--cat-color": c.color,
                        } as React.CSSProperties
                      }
                      onClick={() =>
                        setValue("categoryId", c.id, { shouldDirty: true })
                      }
                    >
                      <span
                        className="category-icon jewel-badge"
                        style={
                          {
                            "--cat-color": c.color,
                          } as React.CSSProperties
                        }
                      >
                        <CategoryIcon name={c.icon} />
                      </span>
                      <span>{c.name}</span>
                    </button>
                  ))}
              </div>
              {categories.length > 6 && (
                <button
                  type="button"
                  className="text-button"
                  aria-expanded={allCategories}
                  onClick={() => setAllCategories(!allCategories)}
                >
                  {allCategories ? "Thu gọn danh mục" : "Xem tất cả danh mục"}
                </button>
              )}
            </fieldset>
          )}
          <label>
            Nội dung
            <input
              placeholder="Khoản này dành cho điều gì?"
              maxLength={160}
              {...register("title")}
            />
          </label>
          <div className="form-field-group">
            <span className="field-title">Thời gian</span>
            <DateTimePickerField
              name="date"
              value={watch("date")}
              onChange={(newVal) =>
                setValue("date", newVal, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          </div>
          <details className="entry-details">
            <summary>Thêm chi tiết · ngày, ghi chú</summary>
            <label>
              Cửa hàng / người nhận
              <input
                placeholder="Không bắt buộc"
                maxLength={120}
                {...register("merchant")}
              />
            </label>
            <label>
              Ghi chú
              <textarea
                rows={2}
                placeholder="Thêm một chút chi tiết…"
                maxLength={2000}
                {...register("note")}
              />
            </label>
          </details>
          <ErrorText error={error} />
          <footer className="sheet-footer">
            <button className="primary" disabled={busy} type="submit">
              <Check size={18} />
              {busy ? "Đang lưu…" : "Lưu giao dịch"}
            </button>
            {!draft.id && (
              <button
                disabled={busy}
                type="button"
                onClick={handleSubmit((v) => save(v, true))}
              >
                Lưu & thêm nữa
              </button>
            )}
            {draft.id && (
              <button
                className="danger-button"
                disabled={busy}
                type="button"
                onClick={remove}
              >
                <Trash2 size={17} />
                Xóa giao dịch
              </button>
            )}
          </footer>
        </form>
      )}
    </Sheet>
  );
}

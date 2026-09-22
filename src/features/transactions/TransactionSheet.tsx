import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Trash2, Check } from "lucide-react";
import { format } from "date-fns";
import { useApp, type Draft } from "../../app/context";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
import { ErrorText, message } from "../../components/ui/Common";
import { CategoryIcon } from "../../components/ui/Icon";
import { now, uid, transactionRepository } from "../../db/repositories";
import { parseMoney } from "../../domain/money";
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
        (categoryFrequency.get(b.id) ?? 0) - (categoryFrequency.get(a.id) ?? 0),
    );
  const categoryId = watch("categoryId");
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
      dirty={!clean && (isDirty || type !== (draft.type ?? "expense"))}
    >
      {!accounts.length ? (
        <div className="empty">
          <h3>Bắt đầu với một tài khoản</h3>
          <p>Thêm tiền mặt, ngân hàng hoặc ví điện tử để ghi nhận giao dịch.</p>
          <Link className="primary" to="/accounts" onClick={onClose}>
            Tạo tài khoản
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
          <label className="amount-field">
            Số tiền <span>VND</span>
            <input
              autoFocus
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              {...register("amount", { required: true })}
            />
            <small>Có thể nhập 45000, 45k hoặc 1.2m</small>
          </label>
          <div className="form-grid">
            <label>
              {type === "transfer" ? "Từ tài khoản" : "Tài khoản"}
              <select {...register("accountId")} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {type === "transfer" && (
              <label>
                Đến tài khoản
                <select {...register("toAccountId")} required>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {type !== "transfer" && type !== "adjustment" && (
            <fieldset>
              <legend>Danh mục</legend>
              <div className="category-picker">
                {categories.map((c) => (
                  <button
                    className={categoryId === c.id ? "chosen" : ""}
                    type="button"
                    key={c.id}
                    aria-pressed={categoryId === c.id}
                    onClick={() =>
                      setValue("categoryId", c.id, { shouldDirty: true })
                    }
                  >
                    <CategoryIcon name={c.icon} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
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
          <label>
            Cửa hàng / người nhận
            <input
              placeholder="Không bắt buộc"
              maxLength={120}
              {...register("merchant")}
            />
          </label>
          <label>
            Thời gian
            <input type="datetime-local" required {...register("date")} />
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

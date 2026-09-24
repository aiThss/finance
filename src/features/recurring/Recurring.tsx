import { SelectField } from "../../components/ui/SelectField";
import { useState } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../../app/context";
import { dayKey, parseMoney, formatAmountInput } from "../../domain/money";
import { recurringRepository, uid } from "../../db/repositories";
import type { RecurringRule } from "../../domain/schema";
import {
  Empty,
  Money,
  PageTitle,
  ErrorText,
  message,
} from "../../components/ui/Common";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
const frequencies = { weekly: "tuần", monthly: "tháng", yearly: "năm" };
export default function Recurring() {
  const { data, notify } = useApp();
  const [edit, setEdit] = useState<RecurringRule | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  function start(r?: RecurringRule) {
    setEdit(
      r ?? {
        id: uid(),
        frequency: "monthly",
        interval: 1,
        nextDate: dayKey(new Date()),
        enabled: true,
        transactionTemplate: {
          type: "expense",
          title: "",
          amountMinor: 0,
          accountId: data.accounts.find((a) => !a.archived)?.id ?? "",
        },
      },
    );
    setAmount(
      r?.transactionTemplate.amountMinor
        ? formatAmountInput(String(r.transactionTemplate.amountMinor))
        : "",
    );
    setError("");
    setDirty(false);
  }
  const today = dayKey(new Date());
  return (
    <>
      <PageTitle
        title="Thu chi định kỳ"
        description="Theo dõi và nhắc nhở các khoản định kỳ"
        action={
          <button
            className="icon-button accent"
            aria-label="Thêm lịch định kỳ"
            onClick={() => start()}
          >
            <Plus />
          </button>
        }
      />
      <p className="notice">
        <CalendarDays size={20} />
        Khoản định kỳ cần bạn xác nhận thủ công khi đến hạn, không tự động trừ
        tiền.
      </p>
      {!data.recurring.length && (
        <Empty
          title="Chưa có lịch định kỳ"
          description="Thiết lập nhắc nhở tiền nhà, internet, hóa đơn hoặc lương định kỳ."
          action="Tạo lịch định kỳ"
          onAction={() => start()}
        />
      )}{" "}
      {data.recurring.map((r) => (
        <article className="recurring-card" key={r.id}>
          <button className="recurring-main" onClick={() => start(r)}>
            <span>
              <strong>{r.transactionTemplate.title}</strong>
              <small>
                {r.nextDate} · Mỗi {r.interval} {frequencies[r.frequency]}
                {!r.enabled ? " · Tạm dừng" : ""}
              </small>
            </span>
            <Money value={r.transactionTemplate.amountMinor} />
          </button>
          {r.enabled && r.nextDate <= today && (
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await recurringRepository.confirm(r.id, r.nextDate);
                  notify("Đã ghi nhận một kỳ thanh toán");
                } catch (e) {
                  notify(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xác nhận kỳ {r.nextDate}
            </button>
          )}
        </article>
      ))}
      {edit && (
        <Sheet title="Lịch thu chi" dirty={dirty} onClose={() => setEdit(null)}>
          {!data.accounts.some((a) => !a.archived) ? (
            <div className="empty">
              <p>Thêm tài khoản trước khi tạo lịch.</p>
              <Link to="/accounts" onClick={() => setEdit(null)}>
                Tạo tài khoản
              </Link>
            </div>
          ) : (
            <form
              onChange={() => setDirty(true)}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await recurringRepository.save({
                    ...edit,
                    anchorDay: Number(edit.nextDate.slice(-2)),
                    transactionTemplate: {
                      ...edit.transactionTemplate,
                      amountMinor: parseMoney(amount),
                    },
                  });
                  setDirty(false);
                  dismissSheet();
                  notify("Đã lưu lịch định kỳ");
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nội dung
                <input
                  required
                  maxLength={160}
                  value={edit.transactionTemplate.title}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      transactionTemplate: {
                        ...edit.transactionTemplate,
                        title: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Loại
                  <SelectField
                    value={edit.transactionTemplate.type}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        transactionTemplate: {
                          ...edit.transactionTemplate,
                          type: e.target.value as "expense" | "income",
                          categoryId: undefined,
                        },
                      })
                    }
                  >
                    <option value="expense">Chi tiêu</option>
                    <option value="income">Thu nhập</option>
                  </SelectField>
                </label>
                <label>
                  Số tiền (VND)
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                  />
                </label>
              </div>
              <label>
                Tài khoản
                <SelectField
                  value={edit.transactionTemplate.accountId}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      transactionTemplate: {
                        ...edit.transactionTemplate,
                        accountId: e.target.value,
                      },
                    })
                  }
                >
                  {data.accounts
                    .filter((a) => !a.archived)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </SelectField>
              </label>
              <label>
                Danh mục
                <SelectField
                  value={edit.transactionTemplate.categoryId ?? ""}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      transactionTemplate: {
                        ...edit.transactionTemplate,
                        categoryId: e.target.value || undefined,
                      },
                    })
                  }
                >
                  <option value="">Không phân loại</option>
                  {data.categories
                    .filter(
                      (c) =>
                        !c.archived && c.type === edit.transactionTemplate.type,
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </SelectField>
              </label>
              <div className="form-grid">
                <label>
                  Lặp mỗi
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={edit.interval}
                    onChange={(e) =>
                      setEdit({ ...edit, interval: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Đơn vị
                  <SelectField
                    value={edit.frequency}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        frequency: e.target.value as RecurringRule["frequency"],
                      })
                    }
                  >
                    {Object.entries(frequencies).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v}
                      </option>
                    ))}
                  </SelectField>
                </label>
              </div>
              <label>
                Kỳ tiếp theo
                <input
                  required
                  type="date"
                  value={edit.nextDate}
                  onChange={(e) =>
                    setEdit({ ...edit, nextDate: e.target.value })
                  }
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={edit.enabled}
                  onChange={(e) =>
                    setEdit({ ...edit, enabled: e.target.checked })
                  }
                />
                Bật lịch này
              </label>
              <ErrorText error={error} />
              <footer className="sheet-footer">
                <button className="primary" disabled={busy}>
                  Lưu lịch
                </button>
                {data.recurring.some((r) => r.id === edit.id) && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Xóa lịch? Các giao dịch đã ghi nhận vẫn được giữ.",
                        )
                      )
                        return;
                      try {
                        await recurringRepository.remove(edit.id);
                        setDirty(false);
                        dismissSheet();
                      } catch (e) {
                        setError(message(e));
                      }
                    }}
                  >
                    Xóa lịch
                  </button>
                )}
              </footer>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}

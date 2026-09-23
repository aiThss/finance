import { SelectField } from "../../components/ui/SelectField";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
} from "date-fns";
import { useApp } from "../../app/context";
import { budgetStatus, monthKey, parseMoney } from "../../domain/money";
import { budgetRepository, uid } from "../../db/repositories";
import type { Budget } from "../../domain/schema";
import {
  Money,
  Empty,
  PageTitle,
  ErrorText,
  message,
} from "../../components/ui/Common";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
export default function Budgets() {
  const { data, notify } = useApp();
  const [date, setDate] = useState(new Date());
  const month = monthKey(date);
  const [edit, setEdit] = useState<Budget | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  function start(b: Budget) {
    setEdit(b);
    setAmount(b.amountMinor ? String(b.amountMinor) : "");
    setError("");
    setDirty(false);
  }
  const items = data.budgets.filter((b) => b.startMonth <= month);
  return (
    <>
      <PageTitle
        title="Ngân sách"
        description="Cho mỗi dự định một khoảng vừa đủ."
        action={
          <button
            className="icon-button accent"
            aria-label="Thêm ngân sách"
            onClick={() =>
              start({
                id: uid(),
                name: "",
                amountMinor: 0,
                period: "monthly",
                startMonth: month,
                enabled: true,
              })
            }
          >
            <Plus />
          </button>
        }
      />
      <div className="month-switch">
        <button
          className="icon-button"
          aria-label="Tháng trước"
          onClick={() => setDate(addMonths(date, -1))}
        >
          <ChevronLeft />
        </button>
        <strong>Tháng {format(date, "MM / yyyy")}</strong>
        <button
          className="icon-button"
          aria-label="Tháng sau"
          onClick={() => setDate(addMonths(date, 1))}
        >
          <ChevronRight />
        </button>
      </div>
      {month === monthKey(new Date()) && (
        <p className="muted">
          Còn {differenceInCalendarDays(endOfMonth(date), new Date()) + 1} ngày
          trong tháng.
        </p>
      )}
      {!items.length && (
        <Empty
          title="Chi tiêu có kế hoạch"
          description="Tạo hạn mức cho cả tháng hoặc riêng một danh mục. Bạn có thể điều chỉnh bất cứ lúc nào."
          action="Tạo ngân sách"
          onAction={() =>
            start({
              id: uid(),
              name: "",
              amountMinor: 0,
              period: "monthly",
              startMonth: month,
              enabled: true,
            })
          }
        />
      )}
      {items.map((b) => {
        const s = budgetStatus(b, data.transactions, month);
        const category = data.categories.find((c) => c.id === b.categoryId);
        const percent = Number.isFinite(s.percent)
          ? Math.max(0, s.percent)
          : b.amountMinor === 0 && s.spent > 0
            ? 100
            : 0;
        const progressColor =
          percent >= 100
            ? "var(--danger)"
            : percent >= 80
              ? "var(--warning)"
              : (category?.color ?? "var(--accent)");
        const progressClass =
          percent >= 100 ? "over" : percent >= 80 ? "near" : "";
        return (
          <button className="budget-card" key={b.id} onClick={() => start(b)}>
            <div className="section-heading">
              <h2>{b.name}</h2>
              <span className={`status-chip ${percent >= 100 ? "over" : ""}`}>
                {!b.enabled
                  ? "Tạm dừng"
                  : percent >= 100
                    ? "Vượt hạn mức"
                    : percent >= 80
                      ? "Gần hạn mức"
                      : "Trong kế hoạch"}
              </span>
            </div>
            <div className="budget-amount">
              <Money value={s.spent} />
              <span>
                {" "}
                / <Money value={b.amountMinor} />
              </span>
            </div>
            <div
              className="liquid-progress"
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              style={
                {
                  "--progress-color": progressColor,
                } as React.CSSProperties
              }
            >
              <div
                className={`liquid-progress-bar ${progressClass}`}
                style={
                  {
                    width: `${Math.min(percent, 100)}%`,
                    "--progress-color": progressColor,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="section-heading muted">
              <span>
                {s.remaining >= 0 ? "Còn lại" : "Vượt"}{" "}
                <Money value={Math.abs(s.remaining)} />
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
          </button>
        );
      })}
      {edit && (
        <Sheet
          title="Ngân sách hàng tháng"
          dirty={dirty}
          onClose={() => setEdit(null)}
        >
          <form
            onChange={() => setDirty(true)}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await budgetRepository.save({
                  ...edit,
                  amountMinor: parseMoney(amount),
                });
                setDirty(false);
                dismissSheet();
                notify("Đã lưu ngân sách");
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Tên ngân sách
              <input
                required
                maxLength={80}
                placeholder="Ví dụ: Ăn ngon, chi vừa"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Hạn mức (VND)
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Danh mục
              <SelectField
                value={edit.categoryId ?? ""}
                onChange={(e) =>
                  setEdit({ ...edit, categoryId: e.target.value || undefined })
                }
              >
                <option value="">Tất cả chi tiêu</option>
                {data.categories
                  .filter((c) => c.type === "expense")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </SelectField>
            </label>
            <label>
              Bắt đầu từ tháng
              <input
                required
                type="month"
                value={edit.startMonth}
                onChange={(e) =>
                  setEdit({ ...edit, startMonth: e.target.value })
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
              Theo dõi ngân sách này
            </label>
            <ErrorText error={error} />
            <footer className="sheet-footer">
              <button disabled={busy} className="primary">
                Lưu ngân sách
              </button>
              {data.budgets.some((b) => b.id === edit.id) && (
                <button
                  type="button"
                  disabled={busy}
                  className="danger-button"
                  onClick={async () => {
                    if (
                      !confirm(
                        "Xóa ngân sách này? Giao dịch vẫn được giữ nguyên.",
                      )
                    )
                      return;
                    try {
                      await budgetRepository.remove(edit.id);
                      setDirty(false);
                      dismissSheet();
                    } catch (e) {
                      setError(message(e));
                    }
                  }}
                >
                  Xóa ngân sách
                </button>
              )}
            </footer>
          </form>
        </Sheet>
      )}
    </>
  );
}

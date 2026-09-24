import { SelectField } from "../../components/ui/SelectField";
import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { useApp } from "../../app/context";
import { dayKey, monthKey, summary } from "../../domain/money";
import { PageTitle, Empty, Money } from "../../components/ui/Common";
import { TransactionRows } from "../../components/finance/TransactionRows";
import { vi } from "../../locales/vi";
export default function Transactions() {
  const { data, openTransaction } = useApp();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const items = useMemo(
    () =>
      data.transactions
        .filter(
          (t) =>
            !t.deletedAt &&
            (!type || t.type === type) &&
            (!account ||
              [t.accountId, t.fromAccountId, t.toAccountId].includes(
                account,
              )) &&
            (!category || t.categoryId === category) &&
            (!from || dayKey(t.occurredAt) >= from) &&
            (!to || dayKey(t.occurredAt) <= to) &&
            [t.title, t.merchant, t.note].some((s) =>
              s?.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi")),
            ),
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [data.transactions, q, type, account, category, from, to],
  );
  const pageCount = Math.max(1, Math.ceil(items.length / 60));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = items.slice(currentPage * 60, (currentPage + 1) * 60);
  const days = [...new Set(shown.map((t) => dayKey(t.occurredAt)))];
  const totals = summary(items);
  return (
    <>
      <PageTitle
        title="Giao dịch"
        description="Lịch sử thu chi và tìm kiếm giao dịch"
        action={
          <button
            className="icon-button accent"
            aria-label="Thêm giao dịch"
            onClick={() => openTransaction()}
          >
            <Plus />
          </button>
        }
      />
      <label className="search">
        <Search size={19} />
        <input
          aria-label="Tìm giao dịch"
          placeholder="Tìm nội dung, cửa hàng, ghi chú…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </label>
      <div className="filters">
        <label>
          Loại
          <SelectField
            aria-label="Loại giao dịch"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Tất cả</option>
            {Object.entries(vi.types).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </SelectField>
        </label>
        <label>
          Ví
          <SelectField
            aria-label="Ví tiền"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">Tất cả</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </SelectField>
        </label>
        <label>
          Danh mục
          <SelectField
            aria-label="Danh mục"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </label>
      </div>
      <details className="date-filter">
        <summary>Khoảng thời gian</summary>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => {
              const today = dayKey(new Date());
              setFrom(today);
              setTo(today);
              setPage(0);
            }}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom(
                dayKey(
                  startOfWeek(new Date(), {
                    weekStartsOn: data.settings.firstDay === "monday" ? 1 : 0,
                  }),
                ),
              );
              setTo(dayKey(new Date()));
              setPage(0);
            }}
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom(`${monthKey(new Date())}-01`);
              setTo(dayKey(new Date()));
              setPage(0);
            }}
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setPage(0);
            }}
          >
            Tất cả ngày
          </button>
        </div>
        <div className="form-grid">
          <label>
            Từ ngày
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </details>
      <div className="list-summary">
        <span>{items.length} giao dịch</span>
        <span>
          Thu <Money value={totals.income} /> · Chi{" "}
          <Money value={totals.expense} />
        </span>
      </div>
      {(q || type || account || category || from || to) && (
        <div style={{ textAlign: "right", margin: "-6px 0 10px" }}>
          <button
            type="button"
            className="text-button"
            style={{ fontSize: "0.85rem", padding: "4px 8px" }}
            onClick={() => {
              setQ("");
              setType("");
              setAccount("");
              setCategory("");
              setFrom("");
              setTo("");
              setPage(0);
            }}
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      )}
      {!items.length ? (
        <Empty
          title="Chưa có giao dịch ở đây"
          description="Thử đổi bộ lọc hoặc thêm giao dịch mới."
          action="Thêm giao dịch"
          onAction={() => openTransaction()}
        />
      ) : (
        days.map((day) => (
          <section key={day} className="day-group">
            <h2>{format(new Date(`${day}T12:00:00`), "dd / MM / yyyy")}</h2>
            <div className="glass-bubble">
              <TransactionRows
                items={shown.filter((t) => dayKey(t.occurredAt) === day)}
              />
            </div>
          </section>
        ))
      )}
      {pageCount > 1 && (
        <div className="section-heading">
          <button
            disabled={currentPage === 0}
            onClick={() => {
              setPage(currentPage - 1);
              window.scrollTo(0, 0);
            }}
          >
            Trang trước
          </button>
          <small>
            {currentPage + 1} / {pageCount}
          </small>
          <button
            disabled={currentPage + 1 >= pageCount}
            onClick={() => {
              setPage(currentPage + 1);
              window.scrollTo(0, 0);
            }}
          >
            Trang sau
          </button>
        </div>
      )}
    </>
  );
}

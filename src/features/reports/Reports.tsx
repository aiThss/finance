import { useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
  eachMonthOfInterval,
} from "date-fns";
import { useApp } from "../../app/context";
import {
  balanceService,
  breakdown,
  dayKey,
  monthKey,
  reportService,
  summary,
} from "../../domain/money";
import { Empty, Money, PageTitle } from "../../components/ui/Common";
export default function Reports() {
  const { data } = useApp();
  const [preset, setPreset] = useState("this");
  const [historyAccount, setHistoryAccount] = useState("");
  const [customFrom, setFrom] = useState(dayKey(startOfMonth(new Date())));
  const [customTo, setTo] = useState(dayKey(new Date()));
  const now = new Date();
  const starts: Record<string, Date> = {
    this: startOfMonth(now),
    last: startOfMonth(subMonths(now, 1)),
    three: startOfMonth(subMonths(now, 2)),
    six: startOfMonth(subMonths(now, 5)),
    year: startOfYear(now),
  };
  const from = preset === "custom" ? customFrom : dayKey(starts[preset]);
  const to =
    preset === "custom"
      ? customTo
      : dayKey(preset === "last" ? endOfMonth(subMonths(now, 1)) : now);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to &&
    from >= "1900-01-01" &&
    to <= "2100-12-31";
  const items = data.transactions.filter(
    (t) =>
      !t.deletedAt &&
      dayKey(t.occurredAt) >= from &&
      dayKey(t.occurredAt) <= to,
  );
  const totals = summary(items);
  const categories = breakdown(items, "categoryId");
  const merchants = breakdown(items, "merchant");
  const months = valid
    ? eachMonthOfInterval({
        start: new Date(`${from}T12:00:00`),
        end: new Date(`${to}T12:00:00`),
      }).slice(-24)
    : [];
  const trend = months.map((m) => ({
    month: monthKey(m),
    ...reportService.getMonthlySummary(items, monthKey(m)),
  }));
  const max = Math.max(1, ...trend.flatMap((t) => [t.income, t.expense]));
  return (
    <>
      <PageTitle
        title="Báo cáo"
        description="Hiểu thói quen, chủ động ngày mai."
      />
      <label>
        Thời gian
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="this">Tháng này</option>
          <option value="last">Tháng trước</option>
          <option value="three">3 tháng</option>
          <option value="six">6 tháng</option>
          <option value="year">Năm nay</option>
          <option value="custom">Tùy chọn</option>
        </select>
      </label>
      {preset === "custom" && (
        <div className="form-grid">
          <label>
            Từ ngày
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={customFrom}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={customTo}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}
      {months.length === 24 && (
        <p className="hint">
          Biểu đồ và lịch sử hiển thị tối đa 24 tháng gần nhất của kỳ đã chọn.
          Tổng thu chi vẫn tính toàn bộ khoảng ngày.
        </p>
      )}
      {!valid ? (
        <p role="alert">Chọn khoảng ngày hợp lệ.</p>
      ) : !items.length ? (
        <Empty
          title="Bức tranh đang chờ nét đầu tiên"
          description="Báo cáo sẽ xuất hiện khi bạn có giao dịch trong khoảng thời gian này."
        />
      ) : (
        <>
          <div className="report-totals">
            <div>
              <span>Thu nhập</span>
              <Money value={totals.income} className="income" />
            </div>
            <div>
              <span>Chi tiêu</span>
              <Money value={totals.expense} />
            </div>
            <div>
              <span>Dòng tiền</span>
              <Money value={totals.net} sign />
            </div>
          </div>
          <section className="panel">
            <h2>Nhịp thu chi</h2>
            <p className="muted">Thu nhập và chi tiêu theo tháng · VND</p>
            <svg
              className="trend-chart"
              viewBox={`0 0 ${Math.max(240, trend.length * 70)} 170`}
              role="img"
              aria-label="Biểu đồ cột thu nhập và chi tiêu theo tháng"
            >
              <line x1="0" x2="100%" y1="140" y2="140" stroke="var(--border)" />
              {trend.map((t, i) => {
                const width = Math.max(240, trend.length * 70) / trend.length;
                return (
                  <g
                    key={t.month}
                    transform={`translate(${i * width + width / 2 - 20},0)`}
                  >
                    <rect
                      x="0"
                      y={140 - (t.income / max) * 115}
                      width="16"
                      height={(t.income / max) * 115}
                      rx="3"
                      fill="var(--income)"
                    />
                    <rect
                      x="22"
                      y={140 - (t.expense / max) * 115}
                      width="16"
                      height={(t.expense / max) * 115}
                      rx="3"
                      fill="var(--expense)"
                    />
                    <text
                      x="20"
                      y="162"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="11"
                    >
                      {t.month.slice(5)}/{t.month.slice(2, 4)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="chart-legend">
              <span className="income">■ Thu nhập</span>
              <span className="expense">■ Chi tiêu</span>
            </div>
            {trend.map((t) => (
              <div className="report-row" key={t.month}>
                <span>{t.month}</span>
                <span>
                  Thu <Money value={t.income} /> · Chi{" "}
                  <Money value={t.expense} />
                  <small>
                    Ròng <Money value={t.net} />
                  </small>
                </span>
              </div>
            ))}
          </section>
          <section>
            <h2>Chi tiêu theo danh mục</h2>
            {!categories.length ? (
              <p className="muted">Chưa có chi tiêu trong kỳ này.</p>
            ) : (
              categories.map((c) => (
                <div className="category-report" key={c.key}>
                  <div className="section-heading">
                    <span>
                      {data.categories.find((x) => x.id === c.key)?.name ??
                        "Khác"}
                    </span>
                    <Money value={c.amount} />
                  </div>
                  <progress value={c.amount} max={totals.expense || 1} />
                  <small>
                    {Math.round((c.amount / (totals.expense || 1)) * 100)}% tổng
                    chi tiêu
                  </small>
                </div>
              ))
            )}
          </section>
          <section>
            <h2>Cửa hàng chi nhiều nhất</h2>
            {merchants.slice(0, 8).map((m, i) => (
              <div className="report-row" key={m.key}>
                <span>
                  <span className="rank">{i + 1}</span>
                  {m.key === "Khác" ? "Chưa ghi cửa hàng" : m.key}
                </span>
                <Money value={m.amount} />
              </div>
            ))}
          </section>
          <section>
            <h2>Lịch sử số dư</h2>
            <label>
              Tài khoản trong lịch sử
              <select
                value={historyAccount}
                onChange={(e) => setHistoryAccount(e.target.value)}
              >
                <option value="">Tất cả tài khoản</option>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              Số dư ban đầu được coi là có trước giao dịch đầu tiên; gồm tài
              khoản lưu trữ.
            </p>
            {months.map((m) => {
              const end = dayKey(addMonths(startOfMonth(m), 1));
              return (
                <div className="report-row" key={monthKey(m)}>
                  <span>{format(m, "MM / yyyy")}</span>
                  <Money
                    value={balanceService.getTotalBalance(
                      data.accounts.filter(
                        (a) => !historyAccount || a.id === historyAccount,
                      ),
                      data.transactions.filter(
                        (t) =>
                          dayKey(t.occurredAt) < end &&
                          dayKey(t.occurredAt) <= to,
                      ),
                    )}
                  />
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}

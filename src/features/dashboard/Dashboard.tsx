import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { vi as dateVi } from "date-fns/locale";
import { useApp } from "../../app/context";
import {
  balanceService,
  monthKey,
  reportService,
  active,
  budgetStatus,
  dayKey,
} from "../../domain/money";
import { settingsRepository } from "../../db/repositories";
import { Empty, Money, message } from "../../components/ui/Common";
import { TransactionRows } from "../../components/finance/TransactionRows";
export default function Dashboard() {
  const { data, openTransaction, notify } = useApp();
  const month = monthKey(new Date());
  const totals = reportService.getMonthlySummary(data.transactions, month);
  const previous = reportService.getMonthlySummary(
    data.transactions,
    monthKey(subMonths(new Date(), 1)),
  );
  const recent = active(data.transactions)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 5);
  const budgets = data.budgets.filter(
    (b) => b.enabled && b.startMonth <= month,
  );
  const upcoming = data.recurring.filter((r) => r.enabled).slice(0, 3);
  return (
    <>
      <header className="home-heading">
        <div>
          <p>{format(new Date(), "EEEE, dd MMMM", { locale: dateVi })}</p>
          <h1>Mỗi ngày, nhẹ lòng hơn.</h1>
        </div>
        <span className="brand-mark">
          <Wallet size={23} />
        </span>
      </header>
      <section className="balance-card">
        <div className="section-heading">
          <span>Tổng số dư</span>
          <button
            className="icon-button"
            aria-label={data.settings.privacy ? "Hiện số tiền" : "Ẩn số tiền"}
            onClick={() =>
              void settingsRepository
                .save({ ...data.settings, privacy: !data.settings.privacy })
                .catch((e) => notify(message(e)))
            }
          >
            {data.settings.privacy ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        <Money
          value={balanceService.getTotalBalance(
            data.accounts,
            data.transactions,
          )}
          className="hero-amount"
        />
        <div className="balance-foot">
          <span>{data.accounts.length} tài khoản · gồm tài khoản lưu trữ</span>
          <Link to="/accounts" aria-label="Xem tài khoản">
            <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
      <div className="section-heading month-heading">
        <h2>Tháng {format(new Date(), "MM / yyyy")}</h2>
        <Link to="/reports">
          Báo cáo <ArrowRight size={15} />
        </Link>
      </div>
      <section className="month-summary">
        <div>
          <span>
            <ArrowDownLeft size={16} /> Thu nhập
          </span>
          <Money value={totals.income} className="income" />
        </div>
        <div>
          <span>
            <ArrowUpRight size={16} /> Chi tiêu
          </span>
          <Money value={totals.expense} />
        </div>
        <div className="net-summary">
          <span>Dòng tiền ròng</span>
          <Money value={totals.net} sign />
        </div>
      </section>
      {previous.expense > 0 && (
        <p className="comparison">
          Chi tiêu {totals.expense <= previous.expense ? "giảm" : "tăng"}{" "}
          <Money value={Math.abs(totals.expense - previous.expense)} /> so với
          tháng trước.
        </p>
      )}
      {!data.accounts.length && (
        <Empty
          title="Một chiếc túi, một khởi đầu."
          description="Thêm tài khoản đầu tiên. Những khoản thu chi của bạn được giữ riêng trên thiết bị này."
          action="Thêm tài khoản"
          onAction={() => location.assign("/accounts")}
        />
      )}
      {!!data.accounts.length && !recent.length && (
        <Empty
          title="Bắt đầu từ một khoản nhỏ"
          description="Bữa trưa, ly cà phê, hay khoản lương đầu tháng. Ghi lại để hiểu tiền của mình hơn."
          action="Thêm giao dịch đầu tiên"
          onAction={() => openTransaction()}
        />
      )}
      {!!budgets.length && (
        <section>
          <div className="section-heading">
            <h2>Trong ngân sách</h2>
            <Link to="/budgets">
              Chi tiết <ArrowRight size={15} />
            </Link>
          </div>
          <div className="panel">
            {budgets.slice(0, 3).map((b) => {
              const s = budgetStatus(b, data.transactions, month);
              return (
                <div className="budget-mini" key={b.id}>
                  <div className="section-heading">
                    <strong>{b.name}</strong>
                    <span>{Math.round(s.percent)}%</span>
                  </div>
                  <progress
                    max={100}
                    value={Math.min(s.percent, 100)}
                    className={
                      s.percent >= 100 ? "over" : s.percent >= 80 ? "near" : ""
                    }
                  />
                  <small>
                    {s.remaining >= 0 ? "Còn " : "Vượt "}
                    <Money value={Math.abs(s.remaining)} />
                  </small>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {!!recent.length && (
        <section>
          <div className="section-heading">
            <h2>Giao dịch gần đây</h2>
            <Link to="/transactions">
              Tất cả <ArrowRight size={15} />
            </Link>
          </div>
          <TransactionRows items={recent} />
        </section>
      )}
      {!!upcoming.length && (
        <section>
          <div className="section-heading">
            <h2>Sắp đến hạn</h2>
            <Link to="/recurring">
              Xem lịch <ArrowRight size={15} />
            </Link>
          </div>
          {upcoming.map((r) => (
            <Link key={r.id} className="upcoming-row" to="/recurring">
              <span>
                <strong>{r.transactionTemplate.title}</strong>
                <small>
                  {r.nextDate <= dayKey(new Date())
                    ? "Đến hạn · chờ xác nhận"
                    : format(new Date(`${r.nextDate}T12:00:00`), "dd/MM/yyyy")}
                </small>
              </span>
              <Money value={r.transactionTemplate.amountMinor} />
            </Link>
          ))}
        </section>
      )}
      {!!data.accounts.length && !!recent.length && (
        <button className="quick-add" onClick={() => openTransaction()}>
          <Plus size={19} />
          Ghi thêm một khoản
        </button>
      )}
      <p className="local-note">
        Chuyện tiền của bạn. Nằm trên thiết bị của bạn.
      </p>
    </>
  );
}

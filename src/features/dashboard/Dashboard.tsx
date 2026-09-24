import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { vi as dateVi } from "date-fns/locale";
import { useApp } from "../../app/context";
import {
  balanceService,
  activeAccounts,
  monthKey,
  reportService,
  active,
  dayKey,
} from "../../domain/money";
import { settingsRepository } from "../../db/repositories";
import { Empty, Money, message } from "../../components/ui/Common";
import { TransactionRows } from "../../components/finance/TransactionRows";
export default function Dashboard() {
  const { data, openTransaction, notify } = useApp();
  const navigate = useNavigate();
  const month = monthKey(new Date());
  const { totals, previous, recent, totalBalance } = useMemo(() => {
    const totals = reportService.getMonthlySummary(data.transactions, month);
    const previous = reportService.getMonthlySummary(
      data.transactions,
      monthKey(subMonths(new Date(), 1)),
    );
    const recent = active(data.transactions)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 5);
    return {
      totals,
      previous,
      recent,
      totalBalance: balanceService.getTotalBalance(
        activeAccounts(data.accounts),
        data.transactions,
      ),
    };
  }, [data.transactions, data.accounts, month]);
  const due = data.recurring.filter(
    (r) => r.enabled && r.nextDate <= dayKey(new Date()),
  );
  return (
    <>
      <header className="home-heading">
        <div>
          <p>{format(new Date(), "EEEE, dd MMMM", { locale: dateVi })}</p>
          <h1>Tổng quan</h1>
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
        <Money value={totalBalance} className="hero-amount" />
        <div className="balance-foot">
          <span>
            {activeAccounts(data.accounts).length} tài khoản đang dùng
          </span>
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
          <Money value={totals.expense} className="expense" />
        </div>
        <div className="net-summary">
          <span>Dòng tiền ròng</span>
          <Money
            value={totals.net}
            sign
            className={
              totals.net > 0 ? "income" : totals.net < 0 ? "expense" : ""
            }
          />
        </div>
      </section>
      {previous.expense > 0 && (
        <div className="comparison-banner">
          <span>
            So với tháng trước: Chi tiêu{" "}
            {totals.expense <= previous.expense ? "giảm" : "tăng"}{" "}
            <Money value={Math.abs(totals.expense - previous.expense)} />
          </span>
        </div>
      )}
      {!data.accounts.length && (
        <Empty
          title="Chưa có tài khoản"
          description="Tạo tài khoản đầu tiên để bắt đầu theo dõi thu chi."
          action="Thêm tài khoản"
          onAction={() => navigate("/accounts")}
        />
      )}
      {!!data.accounts.length && !recent.length && (
        <Empty
          title="Chưa có giao dịch"
          description="Ghi lại thu chi để theo dõi dòng tiền chính xác."
          action="Thêm giao dịch đầu tiên"
          onAction={() => openTransaction()}
        />
      )}
      {!!recent.length && (
        <section>
          <div className="section-heading">
            <h2>Giao dịch gần đây</h2>
            <Link to="/transactions">
              Tất cả <ArrowRight size={15} />
            </Link>
          </div>
          <div className="glass-bubble">
            <TransactionRows items={recent} />
          </div>
        </section>
      )}
      {!!due.length && (
        <Link className="more-row glass-bubble due-bubble" to="/recurring">
          <span>{due.length} khoản định kỳ đến hạn cần xác nhận</span>
          <ArrowRight size={18} />
        </Link>
      )}
    </>
  );
}

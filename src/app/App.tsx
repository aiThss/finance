import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  House,
  ArrowLeftRight,
  Plus,
  ChartNoAxesCombined,
  Ellipsis,
  Wallet,
  Tags,
  CalendarDays,
  Settings,
  Sparkles,
  Trash2,
  ChevronRight,
  WifiOff,
  BookOpen,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { useFinance } from "../db/repositories";
import { initialize } from "../db/seed";
import { AppContext, type Draft } from "./context";
import { TransactionSheet } from "../features/transactions/TransactionSheet";
import Dashboard from "../features/dashboard/Dashboard";
import { PageTitle } from "../components/ui/Common";
const Transactions = lazy(
  () => import("../features/transactions/Transactions"),
);
const Accounts = lazy(() => import("../features/accounts/Accounts"));
const Categories = lazy(() => import("../features/accounts/Categories"));
const Budgets = lazy(() => import("../features/budgets/Budgets"));
const Recurring = lazy(() => import("../features/recurring/Recurring"));
const Reports = lazy(() => import("../features/reports/Reports"));
const AI = lazy(() => import("../features/ai/AI"));
const SettingsPage = lazy(() => import("../features/settings/Settings"));
const Trash = lazy(() => import("../features/settings/Trash"));
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>Chưa thể mở Túi Nhỏ</h1>
        <p>
          Không thể đọc dữ liệu hoặc tải màn hình này. Thử tải lại; đừng xóa dữ
          liệu trình duyệt nếu chưa sao lưu.
        </p>
        <button onClick={() => location.reload()}>Thử lại</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function More() {
  const entries = [
    ["/accounts", "Tài khoản", "Tiền mặt, ngân hàng và các ví", Wallet],
    [
      "/reports",
      "Báo cáo",
      "Một bức tranh rõ hơn về thu chi",
      ChartNoAxesCombined,
    ],
    ["/recurring", "Thu chi định kỳ", "Những khoản quen thuộc", CalendarDays],
    ["/categories", "Danh mục", "Sắp xếp theo cách của bạn", Tags],
    ["/ai", "Trợ lý AI", "Nhập bằng lời, đọc hóa đơn", Sparkles],
    ["/trash", "Thùng rác", "Khôi phục giao dịch đã xóa", Trash2],
    ["/settings", "Cài đặt", "Giao diện, sao lưu và quyền riêng tư", Settings],
  ] as const;
  return (
    <>
      <PageTitle
        title="Góc của bạn"
        description="Mọi thứ để chiếc túi gọn gàng hơn."
      />
      {entries.map(([to, title, description, Icon]) => (
        <Link className="more-row" key={to} to={to}>
          <span className="category-icon">
            <Icon size={21} />
          </span>
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      ))}
      <p className="local-note">
        Túi Nhỏ · Một chút ghi chép, nhẹ lòng mỗi ngày.
      </p>
    </>
  );
}
function Shell() {
  const data = useFinance();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [initError, setInitError] = useState("");
  const [toast, setToast] = useState<{
    text: string;
    action?: () => void;
    label?: string;
  } | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    void initialize().catch(() =>
      setInitError(
        "Không thể mở bộ nhớ cục bộ. Kiểm tra quyền lưu trữ của trình duyệt.",
      ),
    );
  }, []);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    addEventListener("online", online);
    addEventListener("offline", online);
    return () => {
      removeEventListener("online", online);
      removeEventListener("offline", online);
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const theme = data.settings.theme;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      if (Capacitor.isNativePlatform())
        void SystemBars.setStyle({
          style:
            resolved === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        }).catch(() =>
          setToast({
            text: "Không đổi được màu thanh hệ thống trên thiết bị này.",
          }),
        );
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [data?.settings.theme]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.action ? 12000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    if (data && params.has("add")) {
      setDraft({ type: params.get("add") === "income" ? "income" : "expense" });
      setParams({}, { replace: true });
    }
  }, [data, params, setParams]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("backButton", () => {
        if (history.state?.sheet) history.back();
        else if (window.location.pathname !== "/") navigate(-1);
        else void App.minimizeApp();
      });
      if (disposed) await listener.remove();
      else cleanup = () => void listener.remove();
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [navigate]);
  if (initError) throw new Error(initError);
  if (!data)
    return (
      <main className="fatal" role="status">
        Đang mở chiếc túi của bạn…
      </main>
    );
  const notify = (text: string, action?: () => void, label?: string) =>
    setToast({ text, action, label });
  return (
    <AppContext.Provider
      value={{ data, openTransaction: (d = {}) => setDraft(d), notify }}
    >
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <aside className="desktop-sidebar">
        <Link className="brand" to="/">
          <BookOpen size={27} />
          <span>Túi Nhỏ</span>
        </Link>
        <p>Gọn tiền. Nhẹ tâm.</p>
        <nav aria-label="Điều hướng máy tính">
          {[
            ["/", "Tổng quan", House],
            ["/transactions", "Giao dịch", ArrowLeftRight],
            ["/budgets", "Ngân sách", ChartNoAxesCombined],
            ["/accounts", "Tài khoản", Wallet],
            ["/reports", "Báo cáo", ChartNoAxesCombined],
            ["/recurring", "Định kỳ", CalendarDays],
            ["/ai", "Trợ lý AI", Sparkles],
            ["/more", "Góc của bạn", Ellipsis],
          ].map(([to, label, Icon]) => {
            const I = Icon as typeof House;
            return (
              <NavLink end={to === "/"} key={String(to)} to={String(to)}>
                <I size={19} />
                {String(label)}
              </NavLink>
            );
          })}
        </nav>
        <button className="primary" onClick={() => setDraft({})}>
          <Plus size={18} />
          Ghi giao dịch
        </button>
        <Link className="sidebar-settings" to="/settings">
          <Settings size={19} /> Cài đặt
        </Link>
      </aside>
      <div className="mobile-top">
        <Link to="/" className="brand">
          <BookOpen size={21} />
          Túi Nhỏ
        </Link>
        <span className="local-status">
          <span />
          Lưu trên thiết bị
        </span>
      </div>
      <main id="main" className="main-content">
        {offline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            Đang ngoại tuyến · Thu chi vẫn hoạt động
          </div>
        )}
        <Suspense fallback={<p role="status">Đang mở…</p>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/more" element={<More />} />
            <Route
              path="*"
              element={
                <>
                  <PageTitle title="Không tìm thấy trang" />
                  <Link to="/">Về tổng quan</Link>
                </>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <NavLink to="/" end>
          <House size={21} />
          <span>Tổng quan</span>
        </NavLink>
        <NavLink to="/transactions">
          <ArrowLeftRight size={21} />
          <span>Giao dịch</span>
        </NavLink>
        <button
          className="add-nav"
          aria-label="Thêm giao dịch"
          onClick={() => setDraft({})}
        >
          <span>
            <Plus size={25} />
          </span>
          <small>Ghi chép</small>
        </button>
        <NavLink to="/budgets">
          <ChartNoAxesCombined size={21} />
          <span>Ngân sách</span>
        </NavLink>
        <NavLink to="/more">
          <Ellipsis size={22} />
          <span>Khác</span>
        </NavLink>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.();
                setToast(null);
              }}
            >
              {toast.label ?? "Hoàn tác"}
            </button>
          )}
          <button aria-label="Đóng thông báo" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
      {needRefresh && !draft && (
        <div className="update-prompt">
          <p>Có phiên bản Túi Nhỏ mới.</p>
          <button onClick={() => void updateServiceWorker(true)}>
            Cập nhật
          </button>
          <button onClick={() => setNeedRefresh(false)}>Để sau</button>
        </div>
      )}
      {draft && (
        <TransactionSheet draft={draft} onClose={() => setDraft(null)} />
      )}
    </AppContext.Provider>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

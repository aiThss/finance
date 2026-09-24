import { MobileHeader } from "./MobileHeader";
import { BottomNavigation } from "./BottomNavigation";
import { AppRouter } from "./AppRouter";
import {
  Component,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  NavLink,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  House,
  ArrowLeftRight,
  Plus,
  Ellipsis,
  Wallet,
  Settings,
  WifiOff,
} from "lucide-react";
import { TuiNhoMark } from "../components/brand/TuiNhoMark";
import { ApkUpdaterProvider } from "../hooks/useApkUpdater";
import PwaUpdateManager from "./PwaUpdateManager";
import ApkAutoUpdateManager from "./ApkAutoUpdateManager";
import { FinanceScope, PrivacyProvider } from "../db/queries";
import { Capacitor } from "@capacitor/core";
import { NativeSystemBars } from "./NativeSystemBars";
import { initialize } from "../db/seed";
import { AppContext, type Draft } from "./context";
import { TransactionSheet } from "../features/transactions/TransactionSheet";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.error("FATAL ERROR BOUNDARY CAUGHT:", error, info);
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
function Shell() {
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [initError, setInitError] = useState("");
  const [toast, setToast] = useState<{
    text: string;
    action?: () => void;
    label?: string;
  } | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    void initialize()
      .then(() => setReady(true))
      .catch(() =>
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
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.action ? 12000 : 5000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (ready && params.has("add")) {
      setDraft({ type: params.get("add") === "income" ? "income" : "expense" });
      setParams({}, { replace: true });
    }
  }, [ready, params, setParams]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    let disposed = false;
    void import("@capacitor/app").then(async ({ App }) => {
      const listener = await App.addListener("backButton", () => {
        if (
          !window.dispatchEvent(new Event("overlay:back", { cancelable: true }))
        )
          return;
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
  const notify = useCallback(
    (text: string, action?: () => void, label?: string) =>
      setToast({ text, action, label }),
    [],
  );
  const openTransaction = useCallback((d: Draft = {}) => setDraft(d), []);
  const actions = useMemo(
    () => ({ notify, openTransaction }),
    [notify, openTransaction],
  );
  if (initError) throw new Error(initError);
  if (!ready)
    return (
      <main className="fatal" role="status">
        Đang mở chiếc túi của bạn…
      </main>
    );
  return (
    <AppContext.Provider value={actions}>
      <NativeSystemBars />
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <aside className="desktop-sidebar">
        <Link className="brand" to="/">
          <TuiNhoMark size={27} />
          <span>Túi Nhỏ</span>
        </Link>
        <p>Gọn tiền. Nhẹ tâm.</p>
        <nav aria-label="Điều hướng máy tính">
          {[
            ["/", "Tổng quan", House],
            ["/transactions", "Giao dịch", ArrowLeftRight],
            ["/accounts", "Ví tiền", Wallet],
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
      <MobileHeader />
      <main id="main" className="main-content">
        {offline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            Đang ngoại tuyến · Thu chi vẫn hoạt động
          </div>
        )}
        <AppRouter />
      </main>
      <BottomNavigation onAdd={openTransaction} />
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
      {!Capacitor.isNativePlatform() && (
        <PwaUpdateManager sheetOpen={!!draft} />
      )}
      {Capacitor.getPlatform() === "android" && (
        <ApkAutoUpdateManager sheetOpen={!!draft} />
      )}
      {draft && (
        <FinanceScope
          tables={["accounts", "categories", "transactions", "settings"]}
          recentLimit={100}
        >
          <TransactionSheet draft={draft} onClose={() => setDraft(null)} />
        </FinanceScope>
      )}
    </AppContext.Provider>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <PrivacyProvider>
        <ApkUpdaterProvider>
          <BrowserRouter>
            <Shell />
          </BrowserRouter>
        </ApkUpdaterProvider>
      </PrivacyProvider>
    </ErrorBoundary>
  );
}

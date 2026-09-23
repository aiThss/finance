import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { FinanceScope } from "../db/queries";
import { PageTitle } from "../components/ui/Common";
import Dashboard from "../features/dashboard/Dashboard";
import More from "./MorePage";
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

export function AppRouter() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="page-transition">
      <div key={location.pathname} className="page-enter">
        <Suspense fallback={<p role="status">Đang mở…</p>}>
          <Routes>
            <Route
              path="/"
              element={
                <FinanceScope
                  tables={[
                    "accounts",
                    "categories",
                    "transactions",
                    "recurring",
                    "settings",
                  ]}
                >
                  <Dashboard />
                </FinanceScope>
              }
            />
            <Route
              path="/transactions"
              element={
                <FinanceScope
                  tables={[
                    "accounts",
                    "categories",
                    "transactions",
                    "settings",
                  ]}
                >
                  <Transactions />
                </FinanceScope>
              }
            />
            <Route
              path="/accounts"
              element={
                <FinanceScope tables={["accounts", "transactions"]}>
                  <Accounts />
                </FinanceScope>
              }
            />
            <Route
              path="/categories"
              element={
                <FinanceScope
                  tables={[
                    "categories",
                    "transactions",
                    "recurring",
                    "budgets",
                  ]}
                >
                  <Categories />
                </FinanceScope>
              }
            />
            <Route
              path="/budgets"
              element={
                <FinanceScope
                  tables={["categories", "transactions", "budgets"]}
                >
                  <Budgets />
                </FinanceScope>
              }
            />
            <Route
              path="/recurring"
              element={
                <FinanceScope tables={["accounts", "categories", "recurring"]}>
                  <Recurring />
                </FinanceScope>
              }
            />
            <Route
              path="/reports"
              element={
                <FinanceScope
                  tables={["accounts", "categories", "transactions"]}
                >
                  <Reports />
                </FinanceScope>
              }
            />
            <Route
              path="/ai"
              element={
                <FinanceScope tables={["accounts", "categories", "settings"]}>
                  <AI />
                </FinanceScope>
              }
            />
            <Route
              path="/settings"
              element={
                <FinanceScope tables={["settings"]}>
                  <SettingsPage />
                </FinanceScope>
              }
            />
            <Route
              path="/trash"
              element={
                <FinanceScope
                  tables={["accounts", "categories", "transactions"]}
                >
                  <Trash />
                </FinanceScope>
              }
            />
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
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  MoreVertical,
  Sun,
  Moon,
  Smartphone,
  Settings,
  ChartNoAxesCombined,
  Sparkles,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useAppActions } from "./context";
import { useSettings, readSettings } from "../db/queries";
import { settingsRepository } from "../db/repositories";
import { message } from "../components/ui/Common";

export function MobileHeader() {
  const { notify } = useAppActions();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function switchTheme(theme: "dark" | "light" | "system") {
    try {
      const current = await readSettings();
      await settingsRepository.save({ ...current, theme });
      setOpen(false);
    } catch (e) {
      notify(message(e));
    }
  }

  function handleNavigate(to: string) {
    setOpen(false);
    navigate(to);
  }

  const currentTheme = settings.theme;

  return (
    <header className="mobile-top">
      <Link to="/" className="brand">
        <BookOpen size={21} />
        Túi Nhỏ
      </Link>

      <div className="quick-menu-container" ref={menuRef}>
        <button
          type="button"
          className="quick-menu-trigger"
          aria-label="Tùy chọn nhanh"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MoreVertical size={20} />
        </button>

        {open && (
          <div className="quick-menu-dropdown" role="menu">
            {/* Thanh chuyển đổi nhanh Giao diện */}
            <div className="quick-theme-bar">
              <button
                type="button"
                className={`quick-theme-btn ${currentTheme === "dark" ? "active" : ""}`}
                title="Giao diện tối"
                onClick={() => void switchTheme("dark")}
              >
                <Moon size={16} />
                <span>Tối</span>
              </button>
              <button
                type="button"
                className={`quick-theme-btn ${currentTheme === "light" ? "active" : ""}`}
                title="Giao diện sáng"
                onClick={() => void switchTheme("light")}
              >
                <Sun size={16} />
                <span>Sáng</span>
              </button>
              <button
                type="button"
                className={`quick-theme-btn ${currentTheme === "system" ? "active" : ""}`}
                title="Theo thiết bị"
                onClick={() => void switchTheme("system")}
              >
                <Smartphone size={16} />
                <span>Tự động</span>
              </button>
            </div>

            <div className="quick-menu-divider" />

            {/* Danh sách lối tắt nhanh */}
            <div className="quick-menu-links">
              <button
                type="button"
                className="quick-menu-item"
                onClick={() => handleNavigate("/settings")}
              >
                <Settings size={17} />
                <span>Cài đặt hệ thống</span>
              </button>
              <button
                type="button"
                className="quick-menu-item"
                onClick={() => handleNavigate("/reports")}
              >
                <ChartNoAxesCombined size={17} />
                <span>Báo cáo thu chi</span>
              </button>
              <button
                type="button"
                className="quick-menu-item"
                onClick={() => handleNavigate("/ai")}
              >
                <Sparkles size={17} />
                <span>Trợ lý AI</span>
              </button>
              <button
                type="button"
                className="quick-menu-item"
                onClick={() => handleNavigate("/trash")}
              >
                <Trash2 size={17} />
                <span>Thùng rác</span>
              </button>
            </div>

            <div className="quick-menu-divider" />

            {/* Trạng thái an toàn dữ liệu */}
            <div className="quick-menu-footer">
              <ShieldCheck size={14} className="safe-icon" />
              <span>Dữ liệu lưu an toàn trên máy</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

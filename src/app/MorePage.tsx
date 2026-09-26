import type React from "react";
import { Link } from "react-router-dom";
import {
  PiggyBank,
  TrendingUp,
  Settings,
  CalendarDays,
  Tags,
  Sparkles,
  Trash2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { PageTitle } from "../components/ui/Common";

export default function More() {
  const primaryEntries = [
    {
      to: "/budgets",
      title: "Ngân sách",
      description: "Hạn mức chi tiêu mỗi tháng",
      Icon: PiggyBank,
      color: "#10b981",
    },
    {
      to: "/reports",
      title: "Báo cáo",
      description: "Một bức tranh rõ hơn về thu chi",
      Icon: TrendingUp,
      color: "#06b6d4",
    },
    {
      to: "/settings",
      title: "Cài đặt",
      description: "Giao diện, sao lưu và bảo mật",
      Icon: Settings,
      color: "#64748b",
    },
  ] as const;

  const secondaryEntries = [
    {
      to: "/recurring",
      title: "Thu chi định kỳ",
      description: "Quản lý các khoản định kỳ",
      Icon: CalendarDays,
      color: "#f59e0b",
      isAi: false,
    },
    {
      to: "/categories",
      title: "Danh mục",
      description: "Phân loại danh mục thu chi",
      Icon: Tags,
      color: "#d946ef",
      isAi: false,
    },
    {
      to: "/ai",
      title: "Trợ lý AI",
      description: "Nhận diện văn bản & hóa đơn",
      Icon: Sparkles,
      color: "#a855f7",
      isAi: true,
    },
    {
      to: "/trash",
      title: "Thùng rác",
      description: "Khôi phục giao dịch đã xóa",
      Icon: Trash2,
      color: "#f43f5e",
      isAi: false,
    },
  ] as const;

  return (
    <div className="more-page">
      <PageTitle
        title="Góc của bạn"
        description="Công cụ quản lý tài chính và cài đặt hệ thống"
      />
      <div className="vault-banner">
        <ShieldCheck size={15} />
        <span>Dữ liệu ngoại tuyến · Lưu trữ riêng tư 100% trên thiết bị</span>
      </div>
      <div className="glass-bubble more-group">
        {primaryEntries.map(({ to, title, description, Icon, color }) => (
          <Link
            className="more-row"
            key={to}
            to={to}
            style={{ "--item-color": color } as React.CSSProperties}
          >
            <span className="category-icon more-badge">
              <Icon size={21} />
            </span>
            <span className="more-text">
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ChevronRight size={18} className="more-chevron" />
          </Link>
        ))}
      </div>
      <details className="extra-tools glass-bubble">
        <summary>Công cụ khác</summary>
        <div className="extra-tools-grid">
          {secondaryEntries.map(({ to, title, description, Icon, color, isAi }) => (
            <Link
              className={`more-row ${isAi ? "more-row-ai" : ""}`}
              key={to}
              to={to}
              style={{ "--item-color": color } as React.CSSProperties}
            >
              <span className={`category-icon more-badge ${isAi ? "aurora" : ""}`}>
                <Icon size={21} />
              </span>
              <span className="more-text">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={18} className="more-chevron" />
            </Link>
          ))}
        </div>
      </details>
      <p className="local-note">
        Heo Nhỏ · Quản lý tài chính cá nhân an toàn & ngoại tuyến
      </p>
    </div>
  );
}

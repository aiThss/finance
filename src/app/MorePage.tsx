import { Link } from "react-router-dom";
import {
  ChartNoAxesCombined,
  Settings,
  CalendarDays,
  Tags,
  Sparkles,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { PageTitle } from "../components/ui/Common";

export default function More() {
  const entries = [
    [
      "/budgets",
      "Ngân sách",
      "Hạn mức chi tiêu mỗi tháng",
      ChartNoAxesCombined,
    ],
    [
      "/reports",
      "Báo cáo",
      "Một bức tranh rõ hơn về thu chi",
      ChartNoAxesCombined,
    ],
    ["/settings", "Cài đặt", "Giao diện, sao lưu và bảo mật", Settings],
    ["/recurring", "Thu chi định kỳ", "Quản lý các khoản định kỳ", CalendarDays],
    ["/categories", "Danh mục", "Phân loại danh mục thu chi", Tags],
    ["/ai", "Trợ lý AI", "Nhận diện văn bản & hóa đơn", Sparkles],
    ["/trash", "Thùng rác", "Khôi phục giao dịch đã xóa", Trash2],
  ] as const;

  return (
    <>
      <PageTitle
        title="Góc của bạn"
        description="Công cụ quản lý tài chính và cài đặt hệ thống"
      />
      <div className="glass-bubble more-group">
        {entries.slice(0, 3).map(([to, title, description, Icon]) => (
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
      </div>
      <details className="extra-tools glass-bubble">
        <summary>Công cụ khác</summary>
        {entries.slice(3).map(([to, title, description, Icon]) => (
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
      </details>
      <p className="local-note">
        Túi Nhỏ · Quản lý tài chính cá nhân an toàn & ngoại tuyến
      </p>
    </>
  );
}

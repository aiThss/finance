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
      "Đặt giới hạn chi tiêu mỗi tháng",
      ChartNoAxesCombined,
    ],
    ["/settings", "Cài đặt", "Giao diện, sao lưu và quyền riêng tư", Settings],
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
  ] as const;
  return (
    <>
      <PageTitle
        title="Góc của bạn"
        description="Mọi thứ để chiếc túi gọn gàng hơn."
      />
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
      <details className="extra-tools">
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
        Túi Nhỏ · Một chút ghi chép, nhẹ lòng mỗi ngày.
      </p>
    </>
  );
}

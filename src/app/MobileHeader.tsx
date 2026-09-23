import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
export function MobileHeader() {
  return (
    <header className="mobile-top">
      <Link to="/" className="brand">
        <BookOpen size={21} />
        Túi Nhỏ
      </Link>
      <span className="local-status">
        <span />
        Lưu trên thiết bị
      </span>
    </header>
  );
}

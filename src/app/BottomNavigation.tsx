import { NavLink } from "react-router-dom";
import { House, ArrowLeftRight, Wallet, Ellipsis, Plus } from "lucide-react";
export function BottomNavigation({ onAdd }: { onAdd: () => void }) {
  return (
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
        onClick={() => onAdd()}
      >
        <span>
          <Plus size={25} />
        </span>
        <small>Ghi chép</small>
      </button>
      <NavLink to="/accounts">
        <Wallet size={21} />
        <span>Ví tiền</span>
      </NavLink>
      <NavLink to="/more">
        <Ellipsis size={22} />
        <span>Khác</span>
      </NavLink>
    </nav>
  );
}

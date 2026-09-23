import { Wallet, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { usePrivacy } from "../../db/queries";
import { money } from "../../domain/money";
export function Money({
  value,
  className = "",
  sign = false,
}: {
  value: number;
  className?: string;
  sign?: boolean;
}) {
  const privacy = usePrivacy();
  return (
    <span className={`money ${className}`}>
      {privacy ? "••••••" : `${sign && value > 0 ? "+" : ""}${money(value)}`}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Wallet size={26} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button className="primary" onClick={onAction}>
          <Plus size={18} />
          {action}
        </button>
      )}
    </div>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function ErrorText({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="error-message">
      {error}
    </p>
  ) : null;
}
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể hoàn tất. Vui lòng thử lại.";

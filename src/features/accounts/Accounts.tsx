import { SelectField } from "../../components/ui/SelectField";
import { useMemo, useState } from "react";
import { Plus, ArrowUp, Archive, Wallet } from "lucide-react";
import { useApp } from "../../app/context";
import { accountBalances, sum, parseMoney } from "../../domain/money";
import { accountRepository, now, uid } from "../../db/repositories";
import type { Account } from "../../domain/schema";
import {
  Empty,
  ErrorText,
  Money,
  PageTitle,
  message,
} from "../../components/ui/Common";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
import { vi } from "../../locales/vi";
export default function Accounts() {
  const { data, notify } = useApp();
  const [edit, setEdit] = useState<Partial<Account> | null>(null);
  const [archived, setArchived] = useState(false);
  const balances = useMemo(
    () => accountBalances(data.accounts, data.transactions),
    [data.accounts, data.transactions],
  );
  const items = data.accounts.filter((a) => a.archived === archived);
  async function move(id: string) {
    try {
      const ids = data.accounts.map((a) => a.id);
      const i = ids.indexOf(id);
      if (i > 0) {
        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
        await accountRepository.reorder(ids);
      }
    } catch (e) {
      notify(message(e));
    }
  }
  return (
    <>
      <PageTitle
        title="Tài khoản"
        description="Mỗi nơi giữ tiền, cùng một góc nhìn."
        action={
          <button
            className="icon-button accent"
            aria-label="Thêm tài khoản"
            onClick={() => setEdit({})}
          >
            <Plus />
          </button>
        }
      />
      <div className="total-line">
        <span>{archived ? "Số dư đã lưu trữ" : "Tổng số dư đang dùng"}</span>
        <Money value={sum(items.map((a) => balances.get(a.id)!))} />
      </div>
      <div className="segmented">
        <button
          className={!archived ? "selected" : ""}
          onClick={() => setArchived(false)}
        >
          Đang dùng
        </button>
        <button
          className={archived ? "selected" : ""}
          onClick={() => setArchived(true)}
        >
          Đã lưu trữ
        </button>
      </div>
      {!items.length && (
        <Empty
          title={
            archived ? "Không có tài khoản lưu trữ" : "Tiền của bạn đang ở đâu?"
          }
          description="Thêm tài khoản cùng số dư ban đầu. Mọi thay đổi sau đó được tính từ giao dịch."
          action={!archived ? "Thêm tài khoản" : undefined}
          onAction={() => setEdit({})}
        />
      )}
      {items.map((a, i) => (
        <article className="account-card" key={a.id}>
          <button className="account-main" onClick={() => setEdit(a)}>
            <span className="category-icon">
              <Wallet size={21} />
            </span>
            <span>
              <strong>{a.name}</strong>
              <small>{vi.accountTypes[a.type]}</small>
            </span>
            <Money value={balances.get(a.id)!} />
          </button>
          <div className="account-actions">
            <button disabled={i === 0} onClick={() => void move(a.id)}>
              <ArrowUp size={15} />
              Lên trên
            </button>
            <button
              onClick={() =>
                void accountRepository
                  .archive(a.id, !a.archived)
                  .catch((e) => notify(message(e)))
              }
            >
              <Archive size={15} />
              {a.archived ? "Dùng lại" : "Lưu trữ"}
            </button>
            <button onClick={() => setEdit(a)}>Chỉnh sửa</button>
          </div>
        </article>
      ))}
      {edit && <AccountForm initial={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function AccountForm({
  initial,
  onClose,
}: {
  initial: Partial<Account>;
  onClose: () => void;
}) {
  const { data, notify } = useApp();
  const [name, setName] = useState(initial.name ?? "");
  const [type, setType] = useState<Account["type"]>(initial.type ?? "cash");
  const [opening, setOpening] = useState(
    String(initial.openingBalanceMinor ?? 0),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const a: Account = {
        id: initial.id ?? uid(),
        name,
        type,
        currency: "VND",
        openingBalanceMinor: parseMoney(opening),
        archived: initial.archived ?? false,
        order: initial.order ?? data.accounts.length,
        createdAt: initial.createdAt ?? now(),
        updatedAt: now(),
      };
      await (initial.id
        ? accountRepository.update(a)
        : accountRepository.create(a));
      setDirty(false);
      notify("Đã lưu tài khoản");
      dismissSheet();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={initial.id ? "Sửa tài khoản" : "Tài khoản mới"}
      onClose={onClose}
      dirty={dirty}
    >
      <form onSubmit={save} onChange={() => setDirty(true)}>
        <label>
          Tên tài khoản
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="Ví dụ: Tiền mặt, MoMo…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Loại tài khoản
          <SelectField
            value={type}
            onChange={(e) => setType(e.target.value as Account["type"])}
          >
            {Object.entries(vi.accountTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectField>
        </label>
        <label>
          Số dư ban đầu (VND)
          <input
            inputMode="decimal"
            required
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
          />
        </label>
        <p className="hint">
          Nhập số âm nếu đây là khoản nợ thẻ tín dụng. Sửa số dư ban đầu sẽ thay
          đổi số dư toàn bộ lịch sử.
        </p>
        <ErrorText error={error} />
        <footer className="sheet-footer">
          <button className="primary" disabled={busy}>
            Lưu tài khoản
          </button>
        </footer>
      </form>
    </Sheet>
  );
}

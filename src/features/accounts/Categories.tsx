import { SelectField } from "../../components/ui/SelectField";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../../app/context";
import { categoryRepository, uid } from "../../db/repositories";
import type { Category } from "../../domain/schema";
import { PageTitle, ErrorText, message } from "../../components/ui/Common";
import { CategoryIcon, iconNames } from "../../components/ui/Icon";
import { Sheet, dismissSheet } from "../../components/ui/Sheet";
export default function Categories() {
  const { data, notify } = useApp();
  const [edit, setEdit] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  function start(c: Category) {
    setEdit(c);
    setError("");
    setDirty(false);
  }
  return (
    <>
      <PageTitle
        title="Danh mục"
        description="Sắp xếp chi tiêu theo cách của bạn."
        action={
          <button
            className="icon-button accent"
            aria-label="Thêm danh mục"
            onClick={() =>
              start({
                id: uid(),
                name: "",
                type: "expense",
                icon: "wallet",
                color: "#b9d5a4",
                archived: false,
              })
            }
          >
            <Plus />
          </button>
        }
      />
      {(["expense", "income"] as const).map((type) => (
        <section key={type}>
          <h2>{type === "expense" ? "Chi tiêu" : "Thu nhập"}</h2>
          <div className="ledger">
            {data.categories
              .filter((c) => c.type === type)
              .map((c) => (
                <button
                  className="menu-row"
                  key={c.id}
                  onClick={() => start(c)}
                >
                  <span className="category-icon" style={{ color: c.color }}>
                    <CategoryIcon name={c.icon} />
                  </span>
                  <span>
                    {c.name}
                    {c.archived && <small>Đã lưu trữ</small>}
                  </span>
                  <span className="muted">Sửa</span>
                </button>
              ))}
          </div>
        </section>
      ))}
      {edit && (
        <Sheet
          title="Chỉnh sửa danh mục"
          dirty={dirty}
          onClose={() => setEdit(null)}
        >
          <form
            onChange={() => setDirty(true)}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await categoryRepository.save(edit);
                setDirty(false);
                dismissSheet();
                notify("Đã lưu danh mục");
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Tên danh mục
              <input
                required
                maxLength={60}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </label>
            <label>
              Loại
              <SelectField
                disabled={
                  data.transactions.some((t) => t.categoryId === edit.id) ||
                  data.recurring.some(
                    (r) => r.transactionTemplate.categoryId === edit.id,
                  ) ||
                  data.budgets.some((b) => b.categoryId === edit.id)
                }
                value={edit.type}
                onChange={(e) =>
                  setEdit({ ...edit, type: e.target.value as Category["type"] })
                }
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
              </SelectField>
            </label>
            <fieldset>
              <legend>Biểu tượng</legend>
              <div className="icon-picker">
                {iconNames.map((name) => (
                  <button
                    type="button"
                    aria-label={name}
                    aria-pressed={edit.icon === name}
                    className={edit.icon === name ? "chosen" : ""}
                    key={name}
                    onClick={() => {
                      setEdit({ ...edit, icon: name });
                      setDirty(true);
                    }}
                  >
                    <CategoryIcon name={name} />
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Màu biểu tượng
              <input
                type="color"
                value={edit.color}
                onChange={(e) => setEdit({ ...edit, color: e.target.value })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={edit.archived}
                onChange={(e) =>
                  setEdit({ ...edit, archived: e.target.checked })
                }
              />
              Lưu trữ danh mục
            </label>
            <ErrorText error={error} />
            <footer className="sheet-footer">
              <button disabled={busy} className="primary">
                Lưu danh mục
              </button>
            </footer>
          </form>
        </Sheet>
      )}
    </>
  );
}

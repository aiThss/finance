import { useApp } from "../../app/context";
import { transactionRepository } from "../../db/repositories";
import { Empty, Money, PageTitle, message } from "../../components/ui/Common";
export default function Trash() {
  const { data, notify } = useApp();
  const items = data.transactions.filter((t) => t.deletedAt);
  return (
    <>
      <PageTitle
        title="Thùng rác"
        description="Một lần chạm nhầm không làm mất lịch sử."
      />
      {!items.length ? (
        <Empty
          title="Thùng rác đang trống"
          description="Giao dịch đã xóa sẽ ở đây để bạn khôi phục."
        />
      ) : (
        items.map((t) => (
          <div className="trash-row" key={t.id}>
            <span>
              <strong>{t.title}</strong>
              <small>
                <Money value={t.amountMinor} />
              </small>
            </span>
            <button
              onClick={() =>
                void transactionRepository
                  .restore(t.id)
                  .then(() => notify("Đã khôi phục giao dịch"))
                  .catch((e) => notify(message(e)))
              }
            >
              Khôi phục
            </button>
          </div>
        ))
      )}
    </>
  );
}

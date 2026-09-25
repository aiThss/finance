import { useRegisterSW } from "virtual:pwa-register/react";
export default function PwaUpdateManager({
  sheetOpen,
}: {
  sheetOpen: boolean;
}) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <>
      {needRefresh && !sheetOpen && (
        <div className="update-prompt">
          <p>Có phiên bản Heo Nhỏ mới.</p>
          <button onClick={() => void updateServiceWorker(true)}>
            Cập nhật
          </button>
          <button onClick={() => setNeedRefresh(false)}>Để sau</button>
        </div>
      )}
    </>
  );
}

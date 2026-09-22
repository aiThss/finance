import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
// Finish the history transition before unmounting a saved form. A delayed
// history.back() in cleanup could otherwise undo the user's next navigation.
export function dismissSheet() {
  window.dispatchEvent(new Event("sheet:commit"));
}
export function Sheet({
  title,
  children,
  onClose,
  dirty = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  function requestClose() {
    history.back();
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const previousState = history.state;
    history.pushState({ ...previousState, sheet: true }, "");
    const commit = () => {
      dirtyRef.current = false;
      history.back();
    };
    window.addEventListener("sheet:commit", commit);
    const pop = () => {
      if (
        dirtyRef.current &&
        !window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi?")
      ) {
        history.pushState({ ...previousState, sheet: true }, "");
        return;
      }
      closeRef.current();
    };
    window.addEventListener("popstate", pop);
    const unload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("sheet:commit", commit);
      window.removeEventListener("beforeunload", unload);
      document.body.style.overflow = "";
      dialog.close();
      previous?.focus();
      if (history.state?.sheet) history.replaceState(previousState, "");
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="sheet-content">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Đóng"
            onClick={requestClose}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

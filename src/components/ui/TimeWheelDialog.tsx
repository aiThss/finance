import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";

const ROW_HEIGHT = 44;
const pad = (value: number) => String(value).padStart(2, "0");

function TimeWheel({
  label,
  count,
  initial,
  onChange,
  focus = false,
}: {
  label: string;
  count: number;
  initial: number;
  onChange: (value: number) => void;
  focus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    ref.current!.scrollTop = initial * ROW_HEIGHT;
    if (focus) ref.current!.focus({ preventScroll: true });
  }, [initial, focus]);
  function select(value: number) {
    const next = Math.max(0, Math.min(count - 1, value));
    ref.current!.scrollTo({ top: next * ROW_HEIGHT, behavior: "instant" });
    setSelected(next);
    onChange(next);
  }
  return (
    <div className="time-wheel-column">
      <span className="time-wheel-label">{label}</span>
      <div
        ref={ref}
        className="time-wheel"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={selected}
        aria-valuetext={pad(selected)}
        onScroll={(event) => {
          const next = Math.max(
            0,
            Math.min(
              count - 1,
              Math.round(event.currentTarget.scrollTop / ROW_HEIGHT),
            ),
          );
          setSelected(next);
          onChange(next);
        }}
        onKeyDown={(event) => {
          const keys: Record<string, number> = {
            ArrowUp: selected - 1,
            ArrowDown: selected + 1,
            PageUp: selected - 5,
            PageDown: selected + 5,
            Home: 0,
            End: count - 1,
          };
          if (event.key in keys) {
            event.preventDefault();
            select(keys[event.key]);
          }
        }}
      >
        {Array.from({ length: count }, (_, value) => (
          <div
            key={value}
            className="time-wheel-number"
            aria-hidden="true"
            data-distance={Math.min(2, Math.abs(value - selected))}
            onClick={() => select(value)}
          >
            {pad(value)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimeWheelDialog({
  hours,
  minutes,
  onConfirm,
  onClose,
}: {
  hours: number;
  minutes: number;
  onConfirm: (hours: number, minutes: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const selected = useRef({ hours, minutes });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    setReady(true);
    const back = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    window.addEventListener("overlay:back", back);
    return () => {
      window.removeEventListener("overlay:back", back);
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="time-wheel-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="time-wheel-content">
        <header className="time-wheel-header">
          <h2 id={titleId}>Chọn giờ</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Hủy chọn giờ"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="time-wheels">
          <div className="time-wheel-selection" aria-hidden="true" />
          {ready && (
            <TimeWheel
              label="Giờ"
              count={24}
              initial={hours}
              focus
              onChange={(value) => {
                selected.current.hours = value;
              }}
            />
          )}
          <span className="time-wheel-colon" aria-hidden="true">
            :
          </span>
          {ready && (
            <TimeWheel
              label="Phút"
              count={60}
              initial={minutes}
              onChange={(value) => {
                selected.current.minutes = value;
              }}
            />
          )}
        </div>
        <footer className="time-wheel-footer">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onConfirm(selected.current.hours, selected.current.minutes)
            }
          >
            Xong
          </button>
        </footer>
      </div>
    </dialog>
  );
}

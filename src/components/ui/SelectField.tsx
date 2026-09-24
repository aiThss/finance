import {
  useState,
  useRef,
  useId,
  useEffect,
  useCallback,
  Children,
  isValidElement,
  type ComponentPropsWithRef,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";

interface OptionData {
  value: string;
  label: string;
  disabled?: boolean;
}

export function SelectField({
  children,
  className = "",
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: ComponentPropsWithRef<"select">) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const sheetId = useId();

  // Extract options from children
  const options: OptionData[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const childProps = child.props as Record<string, unknown>;
      if (child.type === "option") {
        const val =
          childProps.value !== undefined
            ? String(childProps.value)
            : String(childProps.children ?? "");
        const lbl =
          childProps.children !== undefined
            ? String(childProps.children)
            : val;
        options.push({
          value: val,
          label: lbl,
          disabled: Boolean(childProps.disabled),
        });
      } else if (child.type === "optgroup" && childProps.children) {
        Children.forEach(childProps.children as React.ReactNode, (sub) => {
          if (isValidElement(sub) && sub.type === "option") {
            const subProps = sub.props as Record<string, unknown>;
            const val =
              subProps.value !== undefined
                ? String(subProps.value)
                : String(subProps.children ?? "");
            const lbl =
              subProps.children !== undefined
                ? String(subProps.children)
                : val;
            options.push({
              value: val,
              label: lbl,
              disabled: Boolean(subProps.disabled),
            });
          }
        });
      }
    }
  });

  const [internalValue, setInternalValue] = useState<string>(
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : options[0]?.value ?? "",
  );

  const activeValue = value !== undefined ? String(value) : internalValue;

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value));
    }
  }, [value]);

  const activeOption =
    options.find((o) => o.value === activeValue) ?? options[0];

  const closeSheet = useCallback(() => {
    setOpen(false);
  }, []);

  function openSheet() {
    if (disabled) return;
    setOpen(true);
  }

  // Handle hardware Back button (via Capacitor App backButton -> overlay:back) and Escape key
  useEffect(() => {
    if (!open) return;
    const onBack = (e: Event) => {
      e.preventDefault();
      closeSheet();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSheet();
      }
    };
    window.addEventListener("overlay:back", onBack);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("overlay:back", onBack);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeSheet]);

  // Lock body scroll while open so background cannot be scrolled or interacted with
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function handleSelect(val: string) {
    setInternalValue(val);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      selectRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    closeSheet();
  }

  // Portal target: if inside a <dialog> (like TransactionSheet), portal to the dialog so it is within the Top Layer.
  // Otherwise, portal to document.body to break out of any label, filter, or parent stacking contexts.
  const portalTarget =
    typeof document !== "undefined"
      ? (selectRef.current?.closest("dialog") ?? document.body)
      : null;

  return (
    <span
      className={`select-field ${disabled ? "disabled" : ""} ${className}`}
    >
      <select
        ref={selectRef}
        value={activeValue}
        onChange={(e) => {
          const val = e.target.value;
          setInternalValue(val);
          onChange?.(e);
        }}
        disabled={disabled}
        className="native-select-backing"
        aria-label={String(props["aria-label"] ?? "")}
        onMouseDown={(e) => {
          if (!disabled) {
            e.preventDefault();
            openSheet();
          }
        }}
        onTouchStart={(e) => {
          if (!disabled) {
            e.preventDefault();
            openSheet();
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === " " || e.key === "Enter" || e.key === "ArrowDown")) {
            e.preventDefault();
            openSheet();
          }
        }}
        {...props}
      >
        {children}
      </select>

      <span className="select-visual-trigger" aria-hidden="true">
        <span className="select-label-text">
          {activeOption?.label || "Chọn…"}
        </span>
        <ChevronDown
          size={16}
          className={`select-chevron ${open ? "open" : ""}`}
        />
      </span>

      {open &&
        portalTarget &&
        createPortal(
          <div
            className="select-sheet-backdrop"
            role="presentation"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeSheet();
            }}
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
          >
            <div
              className="select-sheet-content"
              role="dialog"
              aria-modal="true"
              id={sheetId}
              onClick={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="select-sheet-handle" />
              <div className="select-sheet-header">
                <h3>{props["aria-label"] || "Lựa chọn"}</h3>
                <button
                  type="button"
                  className="select-sheet-close"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSheet();
                  }}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="select-sheet-options" role="listbox">
                {options.map((opt) => {
                  const isSelected = opt.value === activeValue;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      disabled={opt.disabled}
                      className={`select-option-row ${isSelected ? "selected" : ""}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt.value);
                      }}
                    >
                      <span className="select-option-label">{opt.label}</span>
                      <span
                        className={`jewel-radio ${isSelected ? "active" : ""}`}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </span>
  );
}

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
  const didPushRef = useRef(false);

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

  // Close sheet and optionally pop history
  const closeSheet = useCallback((fromPopstate = false) => {
    setOpen(false);
    if (!fromPopstate && didPushRef.current) {
      didPushRef.current = false;
      history.back();
    } else {
      didPushRef.current = false;
    }
  }, []);

  function openSheet() {
    if (disabled) return;
    setOpen(true);
    history.pushState({ selectSheet: sheetId }, "");
    didPushRef.current = true;
  }

  // Android/browser Back button closes sheet
  useEffect(() => {
    if (!open) return;
    function handlePop() {
      closeSheet(true);
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [open, closeSheet]);

  function handleSelect(val: string) {
    setInternalValue(val);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      selectRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    closeSheet();
  }

  return (
    // Wrapper span keeps the native <select> in DOM for Playwright/a11y
    <span
      className={`select-field ${disabled ? "disabled" : ""} ${className}`}
    >
      {/*
       * Native <select>:
       * – VISIBLE to Playwright (getByRole combobox, selectOption)
       * – Positioned absolute, fully covering wrapper so a11y tree sees it
       * – mousedown/touchstart prevented so the native OS picker never opens
       * – onChange still fires so Playwright .selectOption() works correctly
       * – Visual opacity=0, pointer-events handled via JS not CSS so events still reach it
       */}
      <select
        ref={selectRef}
        value={activeValue}
        onChange={(e) => {
          // Playwright's selectOption() dispatches change directly
          const val = e.target.value;
          setInternalValue(val);
          onChange?.(e);
        }}
        disabled={disabled}
        className="native-select-backing"
        aria-label={String(props["aria-label"] ?? "")}
        onMouseDown={(e) => {
          // Block native OS picker; we show our custom sheet instead
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
        {...props}
      >
        {children}
      </select>

      {/* Visual Liquid Glass display layer (pointer-events: none — clicks fall through to <select>) */}
      <span className="select-visual-trigger" aria-hidden="true">
        <span className="select-label-text">
          {activeOption?.label || "Chọn…"}
        </span>
        <ChevronDown
          size={16}
          className={`select-chevron ${open ? "open" : ""}`}
        />
      </span>

      {/* Liquid Glass Bottom Sheet Picker */}
      {open && (
        <div
          className="select-sheet-backdrop"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) closeSheet();
          }}
          role="presentation"
        >
          <div
            className="select-sheet-content"
            role="dialog"
            aria-modal="true"
            id={sheetId}
          >
            <div className="select-sheet-handle" />
            <div className="select-sheet-header">
              <h3>{props["aria-label"] || "Lựa chọn"}</h3>
              <button
                type="button"
                className="select-sheet-close"
                onClick={() => closeSheet()}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="select-sheet-options"
              role="listbox"
            >
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
                    onClick={() => handleSelect(opt.value)}
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
        </div>
      )}
    </span>
  );
}

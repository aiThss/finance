import {
  useState,
  useRef,
  useId,
  useEffect,
  Children,
  isValidElement,
  type ComponentPropsWithRef,
  type MouseEvent,
  type TouchEvent,
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

  // Trích xuất các option từ children
  const options: OptionData[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const childProps = child.props as Record<string, unknown>;
      if (child.type === "option") {
        const val = childProps.value !== undefined ? String(childProps.value) : String(childProps.children ?? "");
        const lbl = childProps.children !== undefined ? String(childProps.children) : val;
        options.push({
          value: val,
          label: lbl,
          disabled: Boolean(childProps.disabled),
        });
      } else if (child.type === "optgroup" && childProps.children) {
        Children.forEach(childProps.children as React.ReactNode, (sub) => {
          if (isValidElement(sub) && sub.type === "option") {
            const subProps = sub.props as Record<string, unknown>;
            const val = subProps.value !== undefined ? String(subProps.value) : String(subProps.children ?? "");
            const lbl = subProps.children !== undefined ? String(subProps.children) : val;
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

  // Giá trị hiện tại
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

  const activeOption = options.find((o) => o.value === activeValue) ?? options[0];

  function handleSelect(val: string) {
    setInternalValue(val);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      selectRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setOpen(false);
  }

  function handleOpenPicker(e: MouseEvent | TouchEvent) {
    if (disabled) return;
    // Ngăn chặn WebView Android kích hoạt popup native
    e.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <span
        className={`select-field ${disabled ? "disabled" : ""} ${className}`}
        onClick={handleOpenPicker}
      >
        {/* Thẻ select ngầm phục vụ Playwright E2E, forms & accessibility */}
        <select
          ref={selectRef}
          value={activeValue}
          onChange={(e) => {
            setInternalValue(e.target.value);
            onChange?.(e);
          }}
          disabled={disabled}
          className="native-select-backing"
          onMouseDown={handleOpenPicker}
          onTouchStart={handleOpenPicker}
          {...props}
        >
          {children}
        </select>

        {/* Trigger hiển thị Liquid Glass sang trọng */}
        <span className="select-visual-trigger" aria-hidden="true">
          <span className="select-label-text">
            {activeOption?.label || "Chọn…"}
          </span>
          <ChevronDown
            size={18}
            className={`select-chevron ${open ? "open" : ""}`}
          />
        </span>
      </span>

      {/* Liquid Glass Bottom Sheet Picker */}
      {open && (
        <div
          className="select-sheet-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="select-sheet-content"
            onClick={(e) => e.stopPropagation()}
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
                onClick={() => setOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="select-sheet-options">
              {options.map((opt) => {
                const isSelected = opt.value === activeValue;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    disabled={opt.disabled}
                    className={`select-option-row ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className="select-option-label">{opt.label}</span>
                    <span className={`jewel-radio ${isSelected ? "active" : ""}`}>
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

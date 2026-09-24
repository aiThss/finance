import { useState, useMemo, useRef, useId, useEffect, forwardRef } from "react";
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

interface DateTimePickerFieldProps {
  value?: string; // Định dạng "yyyy-MM-dd'T'HH:mm"
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
}

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VI_WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export const DateTimePickerField = forwardRef<
  HTMLInputElement,
  DateTimePickerFieldProps
>(function DateTimePickerField({ value, onChange, name, id }, ref) {
  // Parse giá trị hiện tại hoặc mặc định là Date.now()
  const currentDate = useMemo(() => {
    if (!value) return new Date();
    try {
      const d = parseISO(value);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }, [value]);

  const [expanded, setExpanded] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(currentDate));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerId = useId();
  const closePicker = () => {
    setExpanded(false);
    triggerRef.current?.focus();
  };

  // Đồng bộ viewMonth khi currentDate thay đổi
  useEffect(() => {
    setViewMonth(startOfMonth(currentDate));
  }, [currentDate]);

  // Cập nhật giá trị ra ngoài theo định dạng yyyy-MM-dd'T'HH:mm
  const emitChange = (newDate: Date) => {
    const formatted = format(newDate, "yyyy-MM-dd'T'HH:mm");
    onChange?.(formatted);
  };

  // Các nút chọn nhanh
  const setQuickDay = (type: "today" | "yesterday" | "2daysAgo") => {
    const now = new Date();
    let targetDay: Date;
    if (type === "today") targetDay = now;
    else if (type === "yesterday") targetDay = subDays(now, 1);
    else targetDay = subDays(now, 2);

    const next = new Date(currentDate);
    next.setFullYear(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
    );
    emitChange(next);
  };

  const setExactNow = () => {
    emitChange(new Date());
  };

  // Chọn ngày từ lịch
  const selectDay = (day: Date) => {
    const next = new Date(currentDate);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    emitChange(next);
  };

  // Thay đổi Giờ / Phút
  const updateHours = (h: number) => {
    const validH = Math.max(0, Math.min(23, isNaN(h) ? 0 : h));
    const next = new Date(currentDate);
    next.setHours(validH);
    emitChange(next);
  };

  const updateMinutes = (m: number) => {
    const validM = Math.max(0, Math.min(59, isNaN(m) ? 0 : m));
    const next = new Date(currentDate);
    next.setMinutes(validM);
    emitChange(next);
  };

  const setPresetTime = (hours: number, minutes: number) => {
    const next = new Date(currentDate);
    next.setHours(hours, minutes, 0, 0);
    emitChange(next);
  };

  // Tính toán lưới lịch
  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start, end });

    let firstDayIndex = getDay(start) - 1;
    if (firstDayIndex === -1) firstDayIndex = 6;

    const blanks = Array.from({ length: firstDayIndex });
    return { blanks, days };
  }, [viewMonth]);

  // Nhãn hiển thị ngày thân thiện
  const formattedDayLabel = useMemo(() => {
    const dayOfWeek = VI_WEEKDAYS[getDay(currentDate)];
    if (isToday(currentDate)) {
      return `Hôm nay, ${format(currentDate, "dd/MM")}`;
    }
    if (isYesterday(currentDate)) {
      return `Hôm qua, ${format(currentDate, "dd/MM")}`;
    }
    return `${dayOfWeek}, ${format(currentDate, "dd/MM/yyyy")}`;
  }, [currentDate]);

  const formattedTimeLabel = useMemo(() => {
    return format(currentDate, "HH:mm");
  }, [currentDate]);

  const isTodayActive = isToday(currentDate);
  const isYesterdayActive = isYesterday(currentDate);
  const is2DaysAgoActive = isSameDay(currentDate, subDays(new Date(), 2));

  return (
    <div className={`datetime-picker-field ${expanded ? "is-expanded" : ""}`}>
      <input
        type="hidden"
        ref={ref}
        name={name}
        id={id}
        value={value ?? ""}
        readOnly
      />
      <button
        ref={triggerRef}
        type="button"
        className="datetime-compact-bar"
        aria-expanded={expanded}
        aria-controls={`${pickerId}-panel`}
        aria-label={`Thời gian giao dịch: ${formattedDayLabel} lúc ${formattedTimeLabel}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CalendarIcon size={18} className="datetime-compact-icon" />
        <span className="datetime-compact-labels">
          <span className="datetime-compact-day">{formattedDayLabel}</span>
          <span className="datetime-compact-time">{formattedTimeLabel}</span>
        </span>
        <ChevronDown size={16} className="datetime-chevron" />
      </button>

      {expanded && (
        <div
          id={`${pickerId}-panel`}
          className="datetime-expanded-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              closePicker();
            }
          }}
        >
          <div
            className="datetime-quick-row"
            role="group"
            aria-label="Chọn nhanh mốc ngày"
          >
            {(
              [
                ["today", "Hôm nay", isTodayActive],
                ["yesterday", "Hôm qua", isYesterdayActive],
                ["2daysAgo", "Hôm kia", is2DaysAgoActive],
              ] as const
            ).map(([day, label, active]) => (
              <button
                key={day}
                type="button"
                className="datetime-chip"
                aria-pressed={active}
                onClick={() => setQuickDay(day)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="calendar-section">
            <div className="calendar-header">
              <span className="cal-month-title" aria-live="polite">
                Tháng {format(viewMonth, "M · yyyy")}
              </span>
              <div className="calendar-navigation">
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                  aria-label="Tháng trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="cal-nav-btn"
                  onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="calendar-grid-weekdays" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span key={day} className="cal-weekday">
                  {day}
                </span>
              ))}
            </div>
            <div
              className="calendar-grid-days"
              role="group"
              aria-label="Chọn ngày giao dịch"
            >
              {calendarDays.blanks.map((_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {calendarDays.days.map((day) => (
                <button
                  key={day.toISOString()}
                  type="button"
                  className="cal-day-btn"
                  aria-label={`${VI_WEEKDAYS[getDay(day)]}, ${format(day, "dd/MM/yyyy")}`}
                  aria-pressed={isSameDay(day, currentDate)}
                  aria-current={isToday(day) ? "date" : undefined}
                  onClick={() => selectDay(day)}
                >
                  {format(day, "d")}
                </button>
              ))}
            </div>
          </div>

          <div className="time-section">
            <span className="time-section-title">
              <Clock size={16} />
              Giờ
            </span>
            <div className="time-inputs-row">
              <input
                aria-label="Giờ"
                type="number"
                inputMode="numeric"
                min={0}
                max={23}
                value={currentDate.getHours()}
                onChange={(e) => updateHours(parseInt(e.target.value, 10))}
              />
              <span className="time-colon" aria-hidden="true">
                :
              </span>
              <input
                aria-label="Phút"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={currentDate.getMinutes()}
                onChange={(e) => updateMinutes(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          <details className="time-presets-disclosure">
            <summary>Chọn nhanh giờ</summary>
            <div
              className="time-presets-grid"
              role="group"
              aria-label="Mốc giờ gợi ý"
            >
              {(
                [
                  [8, 0, "Sáng"],
                  [12, 30, "Trưa"],
                  [18, 30, "Tối"],
                  [21, 0, "Đêm"],
                ] as const
              ).map(([hours, minutes, label]) => (
                <button
                  key={label}
                  type="button"
                  className="time-preset-btn"
                  aria-pressed={
                    currentDate.getHours() === hours &&
                    currentDate.getMinutes() === minutes
                  }
                  onClick={() => setPresetTime(hours, minutes)}
                >
                  {label}{" "}
                  <span>
                    {String(hours).padStart(2, "0")}:
                    {String(minutes).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </details>
          <div className="datetime-panel-footer">
            <button
              type="button"
              className="datetime-now-btn"
              onClick={setExactNow}
            >
              <RotateCcw size={14} />
              Bây giờ
            </button>
            <button
              type="button"
              className="datetime-done-btn"
              onClick={closePicker}
            >
              <Check size={16} />
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

import { useState, useMemo, useRef, useEffect, forwardRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    next.setFullYear(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate());
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

    // Thứ 2 = 1, Chủ nhật = 0 -> Đổi chuẩn sang Thứ 2 là cột 0, Chủ nhật là cột 6
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
    <div className="datetime-picker-field" ref={containerRef}>
      {/* Input ẩn để form tracking và accessibility */}
      <input
        type="hidden"
        ref={ref}
        name={name}
        id={id}
        value={value ?? ""}
        readOnly
      />

      {/* Thẻ hiển thị chính */}
      <div
        className={`datetime-display-card ${expanded ? "active" : ""}`}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`Thời gian giao dịch: ${formattedDayLabel} lúc ${formattedTimeLabel}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="datetime-meta">
          <div className="datetime-sub-block">
            <span className="datetime-icon">
              <CalendarIcon size={16} />
            </span>
            <span className="datetime-text day-text">{formattedDayLabel}</span>
          </div>
          <div className="datetime-divider" />
          <div className="datetime-sub-block">
            <span className="datetime-icon">
              <Clock size={15} />
            </span>
            <span className="datetime-text time-text">{formattedTimeLabel}</span>
          </div>
        </div>
        <button
          type="button"
          className="datetime-toggle-btn"
          aria-label={expanded ? "Thu gọn ngày giờ" : "Tùy chỉnh ngày giờ"}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Đóng" : "Chỉnh"}
        </button>
      </div>

      {/* Hàng nút chọn nhanh */}
      <div className="datetime-quick-row" role="group" aria-label="Chọn nhanh mốc ngày">
        <button
          type="button"
          className={`datetime-chip ${isTodayActive ? "chosen" : ""}`}
          onClick={() => setQuickDay("today")}
        >
          Hôm nay
        </button>
        <button
          type="button"
          className={`datetime-chip ${isYesterdayActive ? "chosen" : ""}`}
          onClick={() => setQuickDay("yesterday")}
        >
          Hôm qua
        </button>
        <button
          type="button"
          className={`datetime-chip ${is2DaysAgoActive ? "chosen" : ""}`}
          onClick={() => setQuickDay("2daysAgo")}
        >
          Hôm kia
        </button>
        <button
          type="button"
          className="datetime-chip now-chip"
          onClick={setExactNow}
          title="Cập nhật giờ thực tế bây giờ"
        >
          <RotateCcw size={12} />
          Bây giờ
        </button>
      </div>

      {/* Panel điều chỉnh chi tiết (Mở rộng) */}
      {expanded && (
        <div className="datetime-expanded-panel">
          {/* Lịch tháng */}
          <div className="calendar-section">
            <div className="calendar-header">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                aria-label="Tháng trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="cal-month-title">
                {format(viewMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                aria-label="Tháng sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="cal-weekday">
                  {wd}
                </div>
              ))}
              {calendarDays.blanks.map((_, i) => (
                <div key={`blank-${i}`} className="cal-day empty" />
              ))}
              {calendarDays.days.map((d) => {
                const isSelected = isSameDay(d, currentDate);
                const isCurToday = isToday(d);
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    className={`cal-day ${isSelected ? "selected" : ""} ${
                      isCurToday ? "is-today" : ""
                    }`}
                    onClick={() => selectDay(d)}
                  >
                    <span>{format(d, "d")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn giờ phút */}
          <div className="time-section">
            <div className="time-header">
              <Clock size={15} />
              <span>Thời gian trong ngày</span>
            </div>
            <div className="time-spinners">
              <div className="time-input-box">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={format(currentDate, "HH")}
                  onChange={(e) => updateHours(parseInt(e.target.value, 10))}
                  aria-label="Giờ"
                />
                <span className="time-unit-label">Giờ</span>
              </div>
              <span className="time-colon">:</span>
              <div className="time-input-box">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={format(currentDate, "mm")}
                  onChange={(e) => updateMinutes(parseInt(e.target.value, 10))}
                  aria-label="Phút"
                />
                <span className="time-unit-label">Phút</span>
              </div>
            </div>

            {/* Mốc giờ quen thuộc */}
            <div className="time-presets">
              <button
                type="button"
                className="time-preset-btn"
                onClick={() => setPresetTime(8, 0)}
              >
                Sáng (08:00)
              </button>
              <button
                type="button"
                className="time-preset-btn"
                onClick={() => setPresetTime(12, 30)}
              >
                Trưa (12:30)
              </button>
              <button
                type="button"
                className="time-preset-btn"
                onClick={() => setPresetTime(18, 30)}
              >
                Tối (18:30)
              </button>
              <button
                type="button"
                className="time-preset-btn"
                onClick={() => setPresetTime(21, 0)}
              >
                Đêm (21:00)
              </button>
            </div>
          </div>

          {/* Nút hoàn tất */}
          <div className="datetime-panel-footer">
            <button
              type="button"
              className="primary datetime-done-btn"
              onClick={() => setExpanded(false)}
            >
              <Check size={16} />
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

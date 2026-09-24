/**
 * WormProgress — Progress bar kiểu "con giun" nhỏ cho APK updater banner.
 *
 * - Chiều cao 6px (track) với worm uốn sóng nhẹ trên phần đã tải
 * - Indeterminate: chạy qua lại khi totalBytes chưa biết
 * - Determinate: sóng tĩnh + clip theo percent thật
 * - prefers-reduced-motion: tắt animation động
 * - Không Canvas, không WebGL, chỉ CSS animation + SVG clip
 * - Đủ accessible: role="progressbar" + aria-valuenow
 *
 * Giữ tên export PixelWavyProgress để không phải đổi imports cũ.
 */
import { useId } from "react";

interface PixelWavyProgressProps {
  /** 0–100, hoặc null/undefined để indeterminate */
  percent: number | null | undefined;
  className?: string;
  "aria-label"?: string;
}

/** Tạo path sóng sin đơn giản cho track width W, biên độ A, số chu kỳ N */
function wavePath(W: number, A: number, cycles: number, yCenter: number): string {
  const step = W / (cycles * 2);
  let d = `M 0 ${yCenter}`;
  for (let i = 0; i < cycles * 2; i++) {
    const cx = (i + 0.5) * step;
    const cy = yCenter + (i % 2 === 0 ? -A : A);
    const ex = (i + 1) * step;
    d += ` Q ${cx} ${cy} ${ex} ${yCenter}`;
  }
  return d;
}

export function PixelWavyProgress({
  percent,
  className = "",
  "aria-label": ariaLabel = "Tiến độ tải",
}: PixelWavyProgressProps) {
  const uid = useId();
  const clipId = `worm-clip-${uid}`;
  const isDeterminate = percent != null && percent >= 0;
  const clamped = isDeterminate ? Math.max(0, Math.min(100, percent!)) : 0;

  // SVG viewport: 200 × 8, track ở y=4, biên độ sóng 1.5px
  const W = 200;
  const H = 8;
  const yMid = 4;
  const amp = 1.5;
  const cycles = 8; // số chu kỳ sóng trong toàn track
  const path = wavePath(W, amp, cycles, yMid);

  return (
    <div
      className={`worm-progress-wrap ${className}`}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={isDeterminate ? clamped : undefined}
      aria-valuemin={isDeterminate ? 0 : undefined}
      aria-valuemax={isDeterminate ? 100 : undefined}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="worm-progress-svg"
        aria-hidden="true"
      >
        <defs>
          {isDeterminate ? (
            <clipPath id={clipId}>
              {/* Clip theo phần trăm, +2px oversize để worm đầu không bị cắt đột ngột */}
              <rect x="0" y="0" width={`${(clamped / 100) * W + 2}`} height={H} />
            </clipPath>
          ) : (
            /* Indeterminate: sliding window 40% width */
            <clipPath id={clipId}>
              <rect x="0" y="0" width={W * 0.4} height={H} className="worm-slide-clip" />
            </clipPath>
          )}
        </defs>

        {/* Track background */}
        <line
          x1="0" y1={yMid}
          x2={W} y2={yMid}
          stroke="var(--border-strong, rgba(255,255,255,0.12))"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Worm (clipped) */}
        <g clipPath={`url(#${clipId})`}>
          <path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDeterminate ? "worm-path-det" : "worm-path-indet"}
          />
          {/* Đuôi sáng nhẹ ở đầu worm khi determinate và có đủ progress */}
          {isDeterminate && clamped > 3 && clamped < 99 && (
            <circle
              cx={`${(clamped / 100) * W}`}
              cy={yMid}
              r="2.5"
              fill="var(--accent)"
              className="worm-head"
              opacity="0.9"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

import { useId } from "react";

interface PixelWavyProgressProps {
  percent: number; // 0 đến 100
  height?: number;
  className?: string;
}

export function PixelWavyProgress({
  percent,
  height = 24,
  className = "",
}: PixelWavyProgressProps) {
  const maskId = useId();
  const clamped = Math.max(0, Math.min(100, percent));

  // Tạo chuỗi đường sóng sin uốn lượn liên tục 400px
  // Chu kỳ bước: 20px (10px lên, 10px xuống)
  const waveWidth = 400;
  const wavelength = 20;
  let wavePath = "M 0 12";
  for (let x = 0; x < waveWidth; x += wavelength) {
    wavePath += ` Q ${x + wavelength / 4} 4, ${x + wavelength / 2} 12 T ${x + wavelength} 12`;
  }

  return (
    <div className={`pixel-wavy-container ${className}`}>
      <svg
        viewBox="0 0 320 24"
        preserveAspectRatio="none"
        className="pixel-wavy-svg"
        style={{ height }}
      >
        <defs>
          <clipPath id={maskId}>
            <rect x="0" y="0" width={`${clamped * 3.2}`} height="24" />
          </clipPath>
          <linearGradient id="wormGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Đường ray nền phía sau (phần chưa tải) */}
        <line
          x1="0"
          y1="12"
          x2="320"
          y2="12"
          className="pixel-track-bg"
          stroke="var(--border-strong)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Đường sóng "con giun" uốn lượn (phần đã tải) */}
        <g clipPath={`url(#${maskId})`}>
          <path
            d={wavePath}
            fill="none"
            stroke="url(#wormGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pixel-worm-path"
          />
        </g>

        {/* Con trỏ ngọc bích phát sáng ở đầu sóng */}
        {clamped > 2 && clamped < 99 && (
          <circle
            cx={clamped * 3.2}
            cy="12"
            r="4.5"
            fill="#34d399"
            className="pixel-worm-head"
          />
        )}
      </svg>
    </div>
  );
}

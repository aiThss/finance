/**
 * TuiNhoMark — Logo canonical của Túi Nhỏ.
 *
 * Hình túi tiền nhỏ, đơn giản, đường nét mềm.
 * Dùng currentColor để phù hợp dark/light mode.
 * Không chứa text, không phụ thuộc font.
 *
 * Sử dụng:
 *   <TuiNhoMark size={24} />
 *   <TuiNhoMark size={32} color="var(--accent)" />
 */
import type { SVGProps } from "react";

interface TuiNhoMarkProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

export function TuiNhoMark({
  size = 24,
  color,
  style,
  ...rest
}: TuiNhoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color: color, flexShrink: 0, ...style }}
      {...rest}
    >
      {/* Dây buộc miệng túi */}
      <path
        d="M9 7 C9 5.5 10.2 4.5 12 4.5 C13.8 4.5 15 5.5 15 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Thân túi — hình oval cạnh dưới phình to */}
      <path
        d="M7.5 7.5 C5.8 7.5 4.5 8.6 4.5 10.5 L4.5 16 C4.5 18.2 6.1 19.5 8.5 19.5 L15.5 19.5 C17.9 19.5 19.5 18.2 19.5 16 L19.5 10.5 C19.5 8.6 18.2 7.5 16.5 7.5 Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M7.5 7.5 C5.8 7.5 4.5 8.6 4.5 10.5 L4.5 16 C4.5 18.2 6.1 19.5 8.5 19.5 L15.5 19.5 C17.9 19.5 19.5 18.2 19.5 16 L19.5 10.5 C19.5 8.6 18.2 7.5 16.5 7.5 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ký hiệu ₫ cách điệu ở giữa túi */}
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="currentColor"
      >
        ₫
      </text>
    </svg>
  );
}

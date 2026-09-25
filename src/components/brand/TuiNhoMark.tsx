/**
 * HeoNhoMark / TuiNhoMark — Logo biểu tượng Heo Nhỏ.
 * Sử dụng hình ảnh nhận diện heo đất 3D thương hiệu mới.
 */
import type { ImgHTMLAttributes } from "react";

interface HeoNhoMarkProps extends ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

export function TuiNhoMark({
  size = 24,
  style,
  className,
  alt = "Heo Nhỏ",
  ...rest
}: HeoNhoMarkProps) {
  return (
    <img
      src="/icon-192.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        objectFit: "cover",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
        ...style,
      }}
      {...rest}
    />
  );
}

export const HeoNhoMark = TuiNhoMark;

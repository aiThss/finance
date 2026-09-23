import { describe, it, expect } from "vitest";
import { jewelColors } from "../db/seed";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Emulates CSS color-mix(in srgb, hex 55%, #000000 45%)
function mixWithBlack(hex: string, hexWeight = 0.55): string {
  const [r, g, b] = hexToRgb(hex);
  const mixed = [
    Math.round(r * hexWeight),
    Math.round(g * hexWeight),
    Math.round(b * hexWeight),
  ];
  return (
    "#" +
    mixed
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

describe("WCAG 2.1 Contrast Ratios", () => {
  const darkBg = "#0A0E0C";
  const lightBg = "#F6F8F5";

  describe("Dark Mode Financial Semantics", () => {
    it("meets WCAG AAA (>= 7:1) or AA (>= 4.5:1)", () => {
      // Income >= 7.0 (AAA)
      expect(contrastRatio("#10B981", darkBg)).toBeGreaterThanOrEqual(7.0);
      // Expense >= 4.5 (AA)
      expect(contrastRatio("#F43F5E", darkBg)).toBeGreaterThanOrEqual(4.5);
      // Transfer >= 7.0 (AAA)
      expect(contrastRatio("#06B6D4", darkBg)).toBeGreaterThanOrEqual(7.0);
      // Warning >= 7.0 (AAA)
      expect(contrastRatio("#F59E0B", darkBg)).toBeGreaterThanOrEqual(7.0);
      // Danger >= 4.5 (AA)
      expect(contrastRatio("#EF4444", darkBg)).toBeGreaterThanOrEqual(4.5);
      // Accent >= 7.0 (AAA)
      expect(contrastRatio("#34D399", darkBg)).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe("Light Mode Financial Semantics", () => {
    it("meets WCAG AA (>= 4.5:1)", () => {
      // Income >= 4.5 (AA)
      expect(contrastRatio("#047857", lightBg)).toBeGreaterThanOrEqual(4.5);
      // Expense >= 4.5 (AA)
      expect(contrastRatio("#BE123C", lightBg)).toBeGreaterThanOrEqual(4.5);
      // Transfer >= 4.5 (AA)
      expect(contrastRatio("#0369A1", lightBg)).toBeGreaterThanOrEqual(4.5);
      // Warning >= 4.5 (AA)
      expect(contrastRatio("#B45309", lightBg)).toBeGreaterThanOrEqual(4.5);
      // Danger >= 4.5 (AA)
      expect(contrastRatio("#B91C1C", lightBg)).toBeGreaterThanOrEqual(4.5);
      // Accent >= 4.5 (AA)
      expect(contrastRatio("#15803D", lightBg)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("16 Jewel Palette in Light Mode via color-mix formula", () => {
    it("all 16 jewel colors mixed with black meet WCAG AA (>= 4.5:1) on light background", () => {
      for (const hex of jewelColors) {
        const darkened = mixWithBlack(hex, 0.55);
        const cr = contrastRatio(darkened, lightBg);
        expect(cr).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});

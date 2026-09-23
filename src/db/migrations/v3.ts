import type { Transaction as DexieTransaction } from "dexie";
import type { Category } from "../../domain/schema";

export const DEFAULT_JEWEL_MAP: Record<string, string> = {
  "Ăn uống": "#F97316",
  "Cà phê": "#D97706",
  "Di chuyển": "#0284C7",
  "Mua sắm": "#D946EF",
  "Gia đình": "#6366F1",
  "Tiền nhà": "#3B82F6",
  "Điện nước": "#EAB308",
  "Giải trí": "#A855F7",
  "Sức khỏe": "#F43F5E",
  "Học tập": "#0D9488",
  "Quà tặng": "#EC4899",
  "Du lịch": "#06B6D4",
  Khác: "#64748B",
  Lương: "#10B981",
  Thưởng: "#F59E0B",
  "Thu nhập khác": "#84CC16",
};

const OLD_COLORS = new Set(["#c2c9b7", "#9ac5b0", "#b9d5a4"]);

export async function migrateToV3(tx: DexieTransaction) {
  await tx
    .table<Category>("categories")
    .toCollection()
    .modify((c) => {
      const colorLower = (c.color || "").toLowerCase();
      if (!c.color || OLD_COLORS.has(colorLower)) {
        const name = c.name?.trim();
        if (name && DEFAULT_JEWEL_MAP[name]) {
          c.color = DEFAULT_JEWEL_MAP[name];
        } else if (c.type === "income") {
          c.color = "#10B981";
        } else {
          c.color = "#64748B";
        }
      }
    });
}

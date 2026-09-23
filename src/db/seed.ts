import { db } from "./schema";
import { settingsSchema } from "../domain/schema";
const names = [
  "Ăn uống",
  "Cà phê",
  "Di chuyển",
  "Mua sắm",
  "Gia đình",
  "Tiền nhà",
  "Điện nước",
  "Giải trí",
  "Sức khỏe",
  "Học tập",
  "Quà tặng",
  "Du lịch",
  "Khác",
  "Lương",
  "Thưởng",
  "Thu nhập khác",
];
const icons = [
  "utensils",
  "coffee",
  "car",
  "shopping",
  "home",
  "home",
  "zap",
  "film",
  "heart",
  "book",
  "gift",
  "plane",
  "wallet",
  "briefcase",
  "gift",
  "wallet",
];
export const jewelColors = [
  "#F97316", // Ăn uống
  "#D97706", // Cà phê
  "#0284C7", // Di chuyển
  "#D946EF", // Mua sắm
  "#6366F1", // Gia đình
  "#3B82F6", // Tiền nhà
  "#EAB308", // Điện nước
  "#A855F7", // Giải trí
  "#F43F5E", // Sức khỏe
  "#0D9488", // Học tập
  "#EC4899", // Quà tặng
  "#06B6D4", // Du lịch
  "#64748B", // Khác
  "#10B981", // Lương
  "#F59E0B", // Thưởng
  "#84CC16", // Thu nhập khác
];
export async function initialize() {
  await db.transaction("rw", [db.preferences, db.categories], async () => {
    if (await db.preferences.get("settings")) return;
    await db.categories.bulkAdd(
      names.map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        type: i < 13 ? ("expense" as const) : ("income" as const),
        icon: icons[i],
        color: jewelColors[i],
        archived: false,
      })),
    );
    await db.preferences.put({
      id: "settings",
      value: settingsSchema.parse({}),
    });
  });
}

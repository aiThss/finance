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
export async function initialize() {
  await db.transaction("rw", [db.preferences, db.categories], async () => {
    if (await db.preferences.get("settings")) return;
    await db.categories.bulkAdd(
      names.map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        type: i < 13 ? ("expense" as const) : ("income" as const),
        icon: icons[i],
        color: i < 13 ? "#c2c9b7" : "#9ac5b0",
        archived: false,
      })),
    );
    await db.preferences.put({
      id: "settings",
      value: settingsSchema.parse({}),
    });
  });
}

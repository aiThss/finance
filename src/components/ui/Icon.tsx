import {
  Wallet,
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  House,
  Zap,
  Clapperboard,
  Heart,
  BookOpen,
  Gift,
  Plane,
  Briefcase,
  ArrowLeftRight,
} from "lucide-react";
const icons = {
  wallet: Wallet,
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  shopping: ShoppingBag,
  home: House,
  zap: Zap,
  film: Clapperboard,
  heart: Heart,
  book: BookOpen,
  gift: Gift,
  plane: Plane,
  briefcase: Briefcase,
  transfer: ArrowLeftRight,
};
export const iconNames = Object.keys(icons);
export function CategoryIcon({ name = "wallet" }: { name?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? Wallet;
  return <Icon size={19} strokeWidth={1.7} />;
}

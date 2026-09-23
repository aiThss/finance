import { useEffect } from "react";
import {
  Capacitor,
  SystemBars,
  SystemBarsStyle,
  registerPlugin,
} from "@capacitor/core";
import { useSettings } from "../db/queries";
import { useAppActions } from "./context";
const WindowAppearance = registerPlugin<{
  setBackground(options: { color: string }): Promise<void>;
}>("WindowAppearance");
export function NativeSystemBars() {
  const settings = useSettings();
  const { notify } = useAppActions();
  useEffect(() => {
    const theme = settings.theme;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      if (Capacitor.isNativePlatform())
        void SystemBars.setStyle({
          style:
            resolved === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        })
          .then(() =>
            WindowAppearance.setBackground({
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--bg")
                .trim(),
            }),
          )
          .catch(() =>
            notify("Không đổi được màu thanh hệ thống trên thiết bị này."),
          );
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [settings.theme, notify]);
  return null;
}

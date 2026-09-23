import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.aithss.finance",
  appName: "Túi Nhỏ",
  webDir: "dist",
  loggingBehavior: "none",
  server: { androidScheme: "https" },
  plugins: {
    SplashScreen: { launchShowDuration: 400, backgroundColor: "#111513" },
    Keyboard: { resize: "body" },
    SystemBars: {
      insetsHandling: "native",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
  },
};
export default config;

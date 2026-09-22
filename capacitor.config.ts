import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.aithss.finance",
  appName: "Túi Nhỏ",
  webDir: "dist",
  server: { androidScheme: "https" },
  plugins: {
    SplashScreen: { launchShowDuration: 400, backgroundColor: "#111513" },
    Keyboard: { resize: "body", resizeOnFullScreen: true },
    SystemBars: { insetsHandling: "css", style: "DARK" },
    StatusBar: { backgroundColor: "#111513", style: "DARK" },
  },
};
export default config;

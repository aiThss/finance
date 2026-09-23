import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import App from "./app/App";
import "./styles/index.css";
async function bootstrap() {
  // Older APKs registered the PWA worker. Retire only those registrations;
  // IndexedDB is untouched. Reload once if a legacy worker controls this load.
  if (Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const removed = await Promise.all(
        registrations.map((r) => r.unregister()),
      );
      if (navigator.serviceWorker.controller && removed.some(Boolean)) {
        location.reload();
        return;
      }
    } catch (error) {
      console.warn("Could not retire legacy native service worker", error);
    }
  }
  createRoot(document.getElementById("root")!).render(<App />);
}
void bootstrap();

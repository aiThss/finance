import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import App from "./app/App";
import "./styles/index.css";
// Android owns system-bar/cutout/IME insets, including the first frame.
// Keep cover on the web for installed PWAs.
if (!Capacitor.isNativePlatform()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute(
      "content",
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
}
createRoot(document.getElementById("root")!).render(<App />);

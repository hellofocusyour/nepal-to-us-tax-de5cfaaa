import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// App version — bump this whenever a deploy needs to invalidate stale client caches/sessions.
const APP_VERSION = "2026-04-29-1";
const VERSION_KEY = "fa_app_version";

(async () => {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== APP_VERSION) {
      // Unregister any service workers from previous deploys
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      // Clear browser Cache Storage
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      localStorage.setItem(VERSION_KEY, APP_VERSION);

      // First time existing users hit the new build — hard reload once to fetch fresh assets
      if (stored !== null) {
        window.location.reload();
        return;
      }
    }
  } catch {
    // non-fatal
  }

  createRoot(document.getElementById("root")!).render(<App />);
})();

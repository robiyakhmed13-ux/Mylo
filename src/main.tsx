import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// DEV SAFETY: if a service worker was previously registered, it may still control the page
// and serve cached/mixed JS chunks, leading to duplicate React instances and hook crashes.
if (!import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => {});
}

// Register service worker only in production builds.
// In preview/dev, caching JS bundles can cause React to load twice, breaking hooks.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

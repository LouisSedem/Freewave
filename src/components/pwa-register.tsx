"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[FreeWave] SW registered", reg.scope);
          // Check for updates periodically
          setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
        })
        .catch((err) =>
          console.warn("[FreeWave] SW registration failed:", err)
        );
    }
  }, []);

  return null;
}

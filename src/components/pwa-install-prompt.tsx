"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if dismissed recently (within 3 days)
    const dismissedAt = localStorage.getItem("fw-install-dismissed");
    if (dismissedAt) {
      const ago = Date.now() - parseInt(dismissedAt, 10);
      if (ago < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("fw-install-dismissed", Date.now().toString());
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-24 left-3 right-3 md:left-auto md:right-4 md:w-80 z-20 bg-[#282828] border border-white/10 rounded-xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-[#727272] hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1db954] to-[#1ed760] flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Install FreeWave</p>
          <p className="text-xs text-[#b3b3b3]">
            Play music in the background with lock screen controls
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#1db954] text-black text-xs font-bold hover:bg-[#1ed760] active:scale-95 transition-all"
        >
          Install
        </button>
      </div>
    </div>
  );
}

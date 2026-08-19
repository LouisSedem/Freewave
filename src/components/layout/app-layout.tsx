"use client";

import React from "react";
import { useView } from "@/store/view-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlayerBar } from "@/components/player/player-bar";
import { PlaybackEngine } from "@/components/player/playback-engine";
import { MediaSessionController } from "@/components/player/media-session-controller";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-[100dvh] flex flex-col bg-[#121212] text-white overflow-hidden">
      <PwaRegister />
      {/* Always-mounted playback engine (handles YouTube + iTunes audio) */}
      <PlaybackEngine />
      {/* Media Session for lock screen controls + background playback */}
      <MediaSessionController />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto fw-scrollbar pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Desktop player bar (UI only) */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile bottom navigation (UI only) */}
      <MobileNav />

      {/* PWA install prompt */}
      <PwaInstallPrompt />
    </div>
  );
}

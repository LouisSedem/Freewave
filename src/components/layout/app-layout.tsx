"use client";

import React, { useEffect } from "react";
import { useView } from "@/store/view-context";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlayerBar } from "@/components/player/player-bar";
import { setProxyUrl } from "@/lib/api";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useEffect(() => {
    // Set your Cloudflare Worker proxy URL here once deployed
    // Example: setProxyUrl("https://freewave-proxy.your-name.workers.dev");
    setProxyUrl("PASTE_YOUR_WORKER_URL_HERE");
  }, []);
  return (
    <div className="h-[100dvh] flex flex-col bg-[#121212] text-white overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto fw-scrollbar pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Desktop player bar */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}

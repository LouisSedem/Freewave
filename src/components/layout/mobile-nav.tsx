"use client";

import React from "react";
import { Home, Search, Library, Music2 } from "lucide-react";
import { useView } from "@/store/view-context";
import { usePlayerStore } from "@/store/player-store";

const NAV_ITEMS = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Library", icon: Library },
];

export function MobileNav() {
  const { view, setView } = useView();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30">
      {/* Mini player when track is active */}
      {currentTrack && (
        <div className="bg-[#1a1a1a] border-t border-white/[0.06] px-3 py-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#282828]">
            {currentTrack.artwork ? (
              <img
                src={currentTrack.artwork}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 size={16} className="text-[#727272]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</p>
          </div>
          <div className="flex-shrink-0">
            {isPlaying ? (
              <div className="flex gap-0.5 items-end h-4">
                <span
                  className="w-0.5 bg-[#1db954] rounded-full animate-pulse"
                  style={{ height: "60%" }}
                />
                <span
                  className="w-0.5 bg-[#1db954] rounded-full animate-pulse"
                  style={{ height: "100%", animationDelay: "0.15s" }}
                />
                <span
                  className="w-0.5 bg-[#1db954] rounded-full animate-pulse"
                  style={{ height: "40%", animationDelay: "0.3s" }}
                />
                <span
                  className="w-0.5 bg-[#1db954] rounded-full animate-pulse"
                  style={{ height: "80%", animationDelay: "0.45s" }}
                />
              </div>
            ) : (
              <Music2 size={16} className="text-[#727272]" />
            )}
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <div className="flex bg-[#121212] border-t border-white/[0.06]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <Icon
                size={22}
                className={isActive ? "text-white" : "text-[#727272]"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-white" : "text-[#727272]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

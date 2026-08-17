"use client";

import React, { useCallback } from "react";
import { Home, Search, Library, Music2, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useView } from "@/store/view-context";
import { usePlayerStore } from "@/store/player-store";

const NAV_ITEMS = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "search" as const, label: "Search", icon: Search },
  { id: "library" as const, label: "Library", icon: Library },
];

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MobileNav() {
  const { view, setView } = useView();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const setProgress = usePlayerStore((s) => s.setProgress);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newProgress = percent * duration;
      setProgress(newProgress);
    },
    [duration, setProgress]
  );

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30">
      {/* Mini player when track is active */}
      {currentTrack && (
        <div className="bg-[#1a1a1a] border-t border-white/[0.06] px-3 pt-2 pb-1">
          {/* Track info row */}
          <div className="flex items-center gap-3">
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
              <p className="text-[11px] text-[#b3b3b3] truncate">{currentTrack.artist}</p>
            </div>
            {/* Playback controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={previous}
                className="p-1.5 text-[#b3b3b3] active:text-white transition-colors"
                aria-label="Previous"
              >
                <SkipBack size={18} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={16} className="text-black" fill="black" />
                ) : (
                  <Play size={16} className="text-black ml-0.5" fill="black" />
                )}
              </button>
              <button
                onClick={next}
                className="p-1.5 text-[#b3b3b3] active:text-white transition-colors"
                aria-label="Next"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5 mb-0.5">
            <span className="text-[10px] text-[#b3b3b3] min-w-[30px] text-right tabular-nums">
              {formatTime(progress)}
            </span>
            <div
              onClick={handleProgressClick}
              className="flex-1 h-2 flex items-center cursor-pointer group"
            >
              <div className="w-full h-1 bg-[#4d4d4d] rounded-full relative group-hover:h-1.5 transition-all">
                <div
                  className="h-full bg-[#1db954] rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#1db954] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
            <span className="text-[10px] text-[#b3b3b3] min-w-[30px] tabular-nums">
              {formatTime(duration)}
            </span>
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

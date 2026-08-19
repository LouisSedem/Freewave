"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { Home, Search, Library, Music2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Loader2 } from "lucide-react";
import { useView } from "@/store/view-context";
import { usePlayerStore } from "@/store/player-store";
import { FullscreenPlayer } from "@/components/player/fullscreen-player";

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
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const isUpgrading = usePlayerStore((s) => s.isUpgrading);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const setProgress = usePlayerStore((s) => s.setProgress);

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const miniPlayerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDraggingMiniPlayer = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const isProgressDragging = useRef(false);

  // Open fullscreen on mini player tap (only if not a drag or progress interaction)
  const handleMiniPlayerClick = useCallback(() => {
    if (!isDraggingMiniPlayer.current && !isProgressDragging.current) {
      setIsFullscreenOpen(true);
    }
  }, []);

  // Swipe up to open fullscreen, swipe down to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!miniPlayerRef.current) return;
    const rect = miniPlayerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    // Only start tracking if touch is on the mini player area
    if (touch.clientY >= rect.top) {
      touchStartY.current = touch.clientY;
      touchCurrentY.current = touch.clientY;
      isDraggingMiniPlayer.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingMiniPlayer.current) return;
    touchCurrentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingMiniPlayer.current) return;
    const delta = touchStartY.current - touchCurrentY.current;
    // Swipe up more than 50px opens fullscreen
    if (delta > 50) {
      setIsFullscreenOpen(true);
    }
    isDraggingMiniPlayer.current = false;
  }, []);

  // Progress bar interaction (prevent opening fullscreen when dragging progress)
  const handleProgressTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      isProgressDragging.current = true;
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      const newProgress = percent * duration;
      setProgress(newProgress);
      seekTo(newProgress);
    },
    [duration, setProgress, seekTo]
  );

  const handleProgressTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isProgressDragging.current || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      const newProgress = percent * duration;
      setProgress(newProgress);
      seekTo(newProgress);
    },
    [duration, setProgress, seekTo]
  );

  const handleProgressTouchEnd = useCallback(() => {
    // Keep isProgressDragging true briefly to prevent fullscreen open
    setTimeout(() => {
      isProgressDragging.current = false;
    }, 100);
  }, []);

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30">
      {/* Fullscreen Player Overlay */}
      <FullscreenPlayer
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      />

      {/* Mini player when track is active */}
      {currentTrack && (
        <div
          ref={miniPlayerRef}
          onClick={handleMiniPlayerClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="bg-[#1a1a1a] border-t border-white/[0.06] px-3 pt-2.5 pb-1.5 cursor-pointer select-none"
          style={{ touchAction: "pan-y" }}
        >
          {/* Progress bar at very top of mini player */}
          <div className="-mx-3 -mt-2.5 mb-1.5">
            <div
              ref={progressRef}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
              onTouchEnd={handleProgressTouchEnd}
              className="w-full h-[3px] bg-white/10 relative"
            >
              <div
                className="h-full bg-[#1db954] rounded-full progress-bar-animated"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Track info row */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#282828] shadow-md">
              {currentTrack.artwork ? (
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 size={18} className="text-[#727272]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {currentTrack.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-[#b3b3b3] truncate">{currentTrack.artist}</p>
                {isUpgrading && (
                  <Loader2 size={10} className="text-[#1db954] animate-spin flex-shrink-0" />
                )}
              </div>
            </div>
            {/* Playback controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); previous(); }}
                className="p-2 text-[#b3b3b3] active:text-white transition-colors"
                aria-label="Previous"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={17} className="text-black" fill="black" />
                ) : (
                  <Play size={17} className="text-black ml-0.5" fill="black" />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="p-2 text-[#b3b3b3] active:text-white transition-colors"
                aria-label="Next"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
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
              className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors active:scale-95"
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

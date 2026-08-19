"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  ChevronDown,
  Heart,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Share2,
  MoreHorizontal,
  Music2,
  Loader2,
} from "lucide-react";
import { usePlayerStore, type Track } from "@/store/player-store";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FullscreenPlayer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    shuffle,
    repeat,
    isUpgrading,
    togglePlay,
    next,
    previous,
    seekTo,
    setProgress,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore();

  const progressRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);

  // Check favorite status when track changes
  useEffect(() => {
    if (!currentTrack) return;
    fetch(`/api/favorites?trackId=${currentTrack.id}`)
      .then((r) => r.json())
      .then((data) => setIsFavorite(!!data.favorite))
      .catch(() => setIsFavorite(false));
  }, [currentTrack?.id]);

  const toggleFavorite = async () => {
    if (!currentTrack) return;
    if (isFavorite) {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: currentTrack.id }),
      });
      setIsFavorite(false);
    } else {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          artwork: currentTrack.artwork,
          source: currentTrack.source,
          videoId: currentTrack.videoId,
          duration: currentTrack.duration,
        }),
      });
      setIsFavorite(true);
    }
  };

  const handleProgressSeek = useCallback(
    (percent: number) => {
      if (!duration) return;
      const newProgress = percent * duration;
      setProgress(newProgress);
      seekTo(newProgress);
    },
    [duration, setProgress, seekTo]
  );

  const getProgressPercent = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !duration) return 0;
      const rect = progressRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [duration]
  );

  // Touch handlers for progress bar
  const handleProgressTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDragging.current = true;
      const percent = getProgressPercent(e.touches[0].clientX);
      handleProgressSeek(percent);
    },
    [getProgressPercent, handleProgressSeek]
  );

  const handleProgressTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      const percent = getProgressPercent(e.touches[0].clientX);
      handleProgressSeek(percent);
    },
    [getProgressPercent, handleProgressSeek]
  );

  const handleProgressTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Click handler for desktop
  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      const percent = getProgressPercent(e.clientX);
      handleProgressSeek(percent);
    },
    [getProgressPercent, handleProgressSeek]
  );

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Fullscreen panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          height: "100dvh",
          background: currentTrack.artwork
            ? `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.85) 40%, #121212 100%)`
            : "#121212",
        }}
      >
        {/* Scrollable content */}
        <div className="h-full overflow-y-auto flex flex-col">
          {/* Status bar spacer + drag handle + close */}
          <div className="flex-shrink-0 pt-3 px-5 pb-2">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onClose}
                className="p-1 text-white/70 hover:text-white transition-colors"
                aria-label="Minimize player"
              >
                <ChevronDown size={28} strokeWidth={2.5} />
              </button>
              <div className="flex items-center gap-1">
                <button className="p-2 text-white/70 hover:text-white transition-colors">
                  <MoreHorizontal size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* Artwork */}
          <div className="flex-shrink-0 flex items-center justify-center px-8 mb-6">
            <div className="w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              {currentTrack.artwork ? (
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#282828] flex items-center justify-center">
                  <Music2 size={64} className="text-[#535353]" />
                </div>
              )}
            </div>
          </div>

          {/* Track info + favorite */}
          <div className="flex-shrink-0 px-8 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-white truncate leading-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-base text-white/60 mt-1 truncate">
                  {currentTrack.artist}
                </p>
                {isUpgrading && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Loader2 size={12} className="text-[#1db954] animate-spin" />
                    <span className="text-xs text-[#1db954]">Finding full track...</span>
                  </div>
                )}
                {currentTrack.source === "youtube" && !isUpgrading && (
                  <span className="inline-block mt-1.5 text-[10px] font-semibold text-[#1db954] bg-[#1db954]/15 px-2 py-0.5 rounded-full">
                    Full Track
                  </span>
                )}
              </div>
              <button
                onClick={toggleFavorite}
                className="p-2 flex-shrink-0 mt-0.5 transition-transform active:scale-90"
                aria-label={isFavorite ? "Remove from liked songs" : "Add to liked songs"}
              >
                <Heart
                  size={24}
                  className={`transition-colors ${
                    isFavorite ? "text-[#1db954] fill-[#1db954]" : "text-white/60"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex-shrink-0 px-8 mb-4">
            <div
              ref={progressRef}
              onTouchStart={handleProgressTouchStart}
              onTouchMove={handleProgressTouchMove}
              onTouchEnd={handleProgressTouchEnd}
              onClick={handleProgressClick}
              className="w-full h-6 flex items-center cursor-pointer"
            >
              <div className="w-full h-1 bg-white/20 rounded-full relative">
                <div
                  className="h-full bg-white rounded-full relative progress-bar-animated"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md" />
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-white/50 tabular-nums">
                {formatTime(progress)}
              </span>
              <span className="text-[11px] text-white/50 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Main controls */}
          <div className="flex-shrink-0 px-8 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  shuffle ? "text-[#1db954]" : "text-white/50 hover:text-white"
                }`}
                aria-label="Shuffle"
              >
                <Shuffle size={22} />
              </button>
              <button
                onClick={previous}
                className="p-2 text-white hover:text-white/80 active:scale-90 transition-all"
                aria-label="Previous"
              >
                <SkipBack size={32} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform shadow-xl"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause size={28} className="text-black" fill="black" />
                ) : (
                  <Play size={28} className="text-black ml-1" fill="black" />
                )}
              </button>
              <button
                onClick={next}
                className="p-2 text-white hover:text-white/80 active:scale-90 transition-all"
                aria-label="Next"
              >
                <SkipForward size={32} fill="currentColor" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2 transition-colors relative ${
                  repeat !== "off" ? "text-[#1db954]" : "text-white/50 hover:text-white"
                }`}
                aria-label="Repeat"
              >
                {repeat === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
                {repeat !== "off" && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1db954]" />
                )}
              </button>
            </div>
          </div>

          {/* Queue toggle */}
          <div className="flex-1" />

          {/* Queue section */}
          {showQueue && (
            <div className="flex-shrink-0 border-t border-white/10 px-8 pt-4 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Up Next</h3>
                <span className="text-xs text-white/40">{queue.length} tracks</span>
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto fw-scrollbar">
                {queue.slice(queueIndex + 1, queueIndex + 20).map((track, i) => (
                  <QueueItem
                    key={`${track.id}-${i}`}
                    track={track}
                    isCurrent={currentTrackId === track.id}
                    onPlay={() => playTrack(track, queue)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom safe area */}
          <div className="h-8" />
        </div>

        {/* Fixed queue button at bottom */}
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
            showQueue ? "bg-white text-black" : "bg-white/15 text-white backdrop-blur-md"
          }`}
          aria-label="Toggle queue"
        >
          <ListMusic size={20} />
        </button>
      </div>
    </>
  );
}

function QueueItem({
  track,
  isCurrent,
  onPlay,
}: {
  track: Track;
  isCurrent: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
        isCurrent ? "bg-white/10" : "hover:bg-white/5"
      }`}
    >
      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#282828]">
        {track.artwork ? (
          <img src={track.artwork} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music2 size={14} className="text-[#535353]" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
          {track.title}
        </p>
        <p className="text-xs text-white/50 truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-white/40 flex-shrink-0">
        {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, "0")}` : "—"}
      </span>
    </button>
  );
}

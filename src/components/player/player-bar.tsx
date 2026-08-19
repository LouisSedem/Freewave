"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  ListMusic,
  Music2,
} from "lucide-react";
import { usePlayerStore } from "@/store/player-store";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    duration,
    shuffle,
    repeat,
    togglePlay,
    next,
    previous,
    setVolume,
    setProgress,
    toggleShuffle,
    cycleRepeat,
    seekTo,
  } = usePlayerStore();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressSeek = useCallback(
    (percent: number) => {
      if (!duration) return;
      const newProgress = percent * duration;
      setProgress(newProgress);
      seekTo(newProgress);
    },
    [duration, setProgress, seekTo]
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      handleProgressSeek(percent);
    },
    [handleProgressSeek]
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleProgressClick(e);
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
        handleProgressSeek(percent);
      };
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleProgressClick, duration, handleProgressSeek]
  );

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const rect = target.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setVolume(percent);
      if (percent > 0) setIsMuted(false);
    },
    [setVolume]
  );

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
    }
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePercent = isMuted ? 0 : volume * 100;
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!currentTrack) {
    return (
      <div className="h-[90px] bg-[#181818] border-t border-[#282828] flex items-center justify-center">
        <p className="text-[#535353] text-sm">Search for any song or pick a genre to start</p>
      </div>
    );
  }

  return (
    <div className="h-[90px] bg-[#181818] border-t border-[#282828] flex items-center px-4 gap-4">
      {/* Left: Track info */}
      <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
        <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[#282828] group cursor-pointer">
          {currentTrack.artwork ? (
            <img src={currentTrack.artwork} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 size={20} className="text-[#727272]" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate hover:underline cursor-pointer">
            {currentTrack.title}
          </p>
          <p className="text-[11px] text-[#b3b3b3] truncate hover:underline cursor-pointer hover:text-white">
            {currentTrack.artist}
          </p>
        </div>
        <button className="flex-shrink-0 text-[#b3b3b3] hover:text-white transition-colors ml-1">
          <Heart size={16} />
        </button>
      </div>

      {/* Center: Controls + Progress */}
      <div className="flex flex-col items-center flex-1 max-w-[722px]">
        <div className="flex items-center gap-4 mb-1">
          <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"}`}>
            <Shuffle size={16} />
          </button>
          <button onClick={previous} className="text-[#b3b3b3] hover:text-white transition-colors">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause size={18} className="text-black" fill="black" /> : <Play size={18} className="text-black ml-0.5" fill="black" />}
          </button>
          <button onClick={next} className="text-[#b3b3b3] hover:text-white transition-colors">
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button onClick={cycleRepeat} className={`transition-colors ${repeat !== "off" ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"}`}>
            {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[11px] text-[#b3b3b3] min-w-[40px] text-right">{formatTime(progress)}</span>
          <div ref={progressRef} onMouseDown={handleProgressMouseDown} className="flex-1 h-3 flex items-center cursor-pointer group">
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full relative group-hover:h-1.5 transition-all">
              <div className="h-full bg-white group-hover:bg-[#1db954] rounded-full progress-bar-animated relative" style={{ width: `${progressPercent}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-[#b3b3b3] min-w-[40px]">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume + Queue */}
      <div className="flex items-center justify-end gap-2 w-[30%] min-w-[180px]">
        <button className="text-[#b3b3b3] hover:text-white transition-colors">
          <ListMusic size={16} />
        </button>
        <button onClick={toggleMute} className="text-[#b3b3b3] hover:text-white transition-colors">
          <VolumeIcon size={16} />
        </button>
        <div onClick={handleVolumeClick} className="w-24 h-3 flex items-center cursor-pointer group">
          <div className="w-full h-1 bg-[#4d4d4d] rounded-full relative group-hover:h-1.5 transition-all">
            <div className="h-full bg-white group-hover:bg-[#1db954] rounded-full relative" style={{ width: `${volumePercent}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

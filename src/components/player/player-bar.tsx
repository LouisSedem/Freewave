"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

// YouTube IFrame API types
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
  var YT: {
    Player: new (
      elementId: string,
      options: {
        height?: string;
        width?: string;
        videoId?: string;
        playerVars?: Record<string, unknown>;
        events?: {
          onReady?: (event: { target: YTPlayerInstance }) => void;
          onStateChange?: (event: { data: number }) => void;
        };
      }
    ) => YTPlayerInstance;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
      BUFFERING: number;
    };
    ready: (callback: () => void) => void;
  };
}

interface YTPlayerInstance {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
  getPlayerState: () => number;
}

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
    setDuration,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore();

  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const progressRef = useRef<HTMLDivElement>(null);

  // Audio element for iTunes previews
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // YouTube player refs
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const apiLoadedRef = useRef(false);

  // Start progress polling for YouTube
  const startYTProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (player) {
        try {
          const currentTime = player.getCurrentTime();
          const dur = player.getDuration();
          if (currentTime > 0) setProgress(currentTime);
          if (dur > 0) setDuration(dur);
        } catch {
          // Player might not be ready
        }
      }
    }, 250);
  }, [setProgress, setDuration]);

  const stopYTProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (apiLoadedRef.current) return;
    apiLoadedRef.current = true;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      // Create the player instance once the API is loaded
      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player("yt-player", {
          height: "1",
          width: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
            },
            onStateChange: (event) => {
              // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
              if (event.data === window.YT.PlayerState.ENDED) {
                stopYTProgressPolling();
                // Use setTimeout to let the store update before triggering next
                setTimeout(() => next(), 100);
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                startYTProgressPolling();
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                stopYTProgressPolling();
              }
            },
          },
        });
      }
    };

    return () => {
      stopYTProgressPolling();
    };
  }, [next, startYTProgressPolling, stopYTProgressPolling]);

  // Handle track changes - YouTube
  useEffect(() => {
    const videoId = currentTrack?.videoId;
    if (!videoId || currentTrack?.source !== "youtube") return;

    // Don't reload if same video
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;

    // Wait for YT API + player to be ready
    const tryLoadVideo = () => {
      const player = ytPlayerRef.current;
      if (player && ytReadyRef.current) {
        player.loadVideoById(videoId);
        setDuration(0);
        setProgress(0);
      } else {
        // Retry after a short delay
        setTimeout(tryLoadVideo, 200);
      }
    };
    tryLoadVideo();
  }, [currentTrack?.videoId, currentTrack?.source, setDuration, setProgress]);

  // Sync play/pause with YouTube player
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    if (currentTrack?.source !== "youtube") return;

    try {
      if (isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch {
      // Player might be transitioning
    }
  }, [isPlaying, currentTrack?.source]);

  // Sync volume with YouTube player
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    try {
      player.setVolume(isMuted ? 0 : Math.round(volume * 100));
    } catch {
      // ignore
    }
  }, [volume, isMuted]);

  // Handle track changes - iTunes
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.source === "itunes" && currentTrack.previewUrl) {
      // Stop YouTube progress polling when playing iTunes
      stopYTProgressPolling();

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("timeupdate", () => {
          if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
          }
        });
        audioRef.current.addEventListener("loadedmetadata", () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        });
        audioRef.current.addEventListener("ended", () => {
          next();
        });
      }
      audioRef.current.src = currentTrack.previewUrl;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [currentTrack, isPlaying, next, setProgress, setDuration, stopYTProgressPolling]);

  // Sync play/pause with iTunes audio
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && currentTrack?.source === "itunes") {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.source]);

  // Sync volume with iTunes audio
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle progress bar click
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newProgress = percent * duration;
      setProgress(newProgress);

      if (currentTrack?.source === "itunes" && audioRef.current) {
        audioRef.current.currentTime = newProgress;
      } else if (currentTrack?.source === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.seekTo(newProgress, true);
        } catch {
          // ignore
        }
      }
    },
    [duration, setProgress, currentTrack?.source]
  );

  // Handle progress bar drag (for better UX)
  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      handleProgressClick(e);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
        const newProgress = percent * duration;
        setProgress(newProgress);

        if (currentTrack?.source === "itunes" && audioRef.current) {
          audioRef.current.currentTime = newProgress;
        } else if (currentTrack?.source === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.seekTo(newProgress, true);
          } catch {
            // ignore
          }
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [handleProgressClick, duration, setProgress, currentTrack?.source]
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
    <>
      {/* Hidden YouTube player */}
      <div
        id="yt-player"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 0,
        }}
      />

      <div className="h-[90px] bg-[#181818] border-t border-[#282828] flex items-center px-4 gap-4">
        {/* Left: Track info */}
        <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
          <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-[#282828] group cursor-pointer">
            {currentTrack.artwork ? (
              <img
                src={currentTrack.artwork}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
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
          {/* Controls */}
          <div className="flex items-center gap-4 mb-1">
            <button
              onClick={toggleShuffle}
              className={`transition-colors ${
                shuffle ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              <Shuffle size={16} />
            </button>
            <button
              onClick={previous}
              className="text-[#b3b3b3] hover:text-white transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={18} className="text-black" fill="black" />
              ) : (
                <Play size={18} className="text-black ml-0.5" fill="black" />
              )}
            </button>
            <button
              onClick={next}
              className="text-[#b3b3b3] hover:text-white transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`transition-colors ${
                repeat !== "off" ? "text-[#1db954]" : "text-[#b3b3b3] hover:text-white"
              }`}
            >
              {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] text-[#b3b3b3] min-w-[40px] text-right">
              {formatTime(progress)}
            </span>
            <div
              ref={progressRef}
              onMouseDown={handleProgressMouseDown}
              className="flex-1 h-3 flex items-center cursor-pointer group"
            >
              <div className="w-full h-1 bg-[#4d4d4d] rounded-full relative group-hover:h-1.5 transition-all">
                <div
                  className="h-full bg-white group-hover:bg-[#1db954] rounded-full progress-bar-animated relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-[#b3b3b3] min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume + Queue */}
        <div className="flex items-center justify-end gap-2 w-[30%] min-w-[180px]">
          <button className="text-[#b3b3b3] hover:text-white transition-colors">
            <ListMusic size={16} />
          </button>
          <button
            onClick={toggleMute}
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <VolumeIcon size={16} />
          </button>
          <div
            onClick={handleVolumeClick}
            className="w-24 h-3 flex items-center cursor-pointer group"
          >
            <div className="w-full h-1 bg-[#4d4d4d] rounded-full relative group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1db954] rounded-full relative"
                style={{ width: `${volumePercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

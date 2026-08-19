"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { usePlayerStore, type Track } from "@/store/player-store";

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

/**
 * Always-mounted component that handles ALL audio playback.
 * Renders only the hidden #yt-player div — no visible UI.
 * Both PlayerBar (desktop) and MobileNav (mobile) read state from the store.
 */
export function PlaybackEngine() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const next = usePlayerStore((s) => s.next);
  const seekPosition = usePlayerStore((s) => s.seekPosition);
  const clearSeek = usePlayerStore((s) => s.clearSeek);

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

  // Expose seekTo and stopPolling for external components (via store)
  useEffect(() => {
    usePlayerStore.setState({ _seekToYt: (seconds: number) => {
      const player = ytPlayerRef.current;
      if (player && ytReadyRef.current) {
        try { player.seekTo(seconds, true); } catch {}
      }
    }, _seekToAudio: (seconds: number) => {
      if (audioRef.current) audioRef.current.currentTime = seconds;
    }, _stopYtPolling: stopYTProgressPolling });
  }, [stopYTProgressPolling]);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (apiLoadedRef.current) return;
    apiLoadedRef.current = true;

    const createPlayer = () => {
      if (ytPlayerRef.current) return;
      try {
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
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                stopYTProgressPolling();
                setTimeout(() => next(), 100);
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                startYTProgressPolling();
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                stopYTProgressPolling();
              }
            },
          },
        });
      } catch (e) {
        console.error("[FreeWave] Failed to create YT player:", e);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    return () => {
      stopYTProgressPolling();
    };
  }, [next, startYTProgressPolling, stopYTProgressPolling]);

  // Reset YouTube video ref when track changes entirely
  useEffect(() => {
    currentVideoIdRef.current = null;
  }, [currentTrack?.id]);

  // Handle track changes - YouTube
  useEffect(() => {
    const videoId = currentTrack?.videoId;
    if (!videoId || currentTrack?.source !== "youtube") return;
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;

    // Stop any iTunes audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    stopYTProgressPolling();

    let retries = 0;
    const tryLoadVideo = () => {
      const player = ytPlayerRef.current;
      if (player && ytReadyRef.current) {
        try {
          player.loadVideoById(videoId);
          setDuration(0);
          setProgress(0);
        } catch (e) {
          console.error("[FreeWave] Failed to load video:", e);
        }
      } else if (retries < 50) {
        retries++;
        setTimeout(tryLoadVideo, 200);
      }
    };
    tryLoadVideo();
  }, [currentTrack?.videoId, currentTrack?.source, setDuration, setProgress, stopYTProgressPolling]);

  // Sync play/pause with YouTube
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    if (currentTrack?.source !== "youtube") return;
    try {
      if (isPlaying) player.playVideo();
      else player.pauseVideo();
    } catch {}
  }, [isPlaying, currentTrack?.source]);

  // Sync volume with YouTube
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !ytReadyRef.current) return;
    try { player.setVolume(Math.round(volume * 100)); } catch {}
  }, [volume]);

  // Handle track changes - iTunes
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.source === "youtube") return;

    if (currentTrack.source === "itunes" && currentTrack.previewUrl) {
      stopYTProgressPolling();

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("timeupdate", () => {
          if (audioRef.current) setProgress(audioRef.current.currentTime);
        });
        audioRef.current.addEventListener("loadedmetadata", () => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        });
        audioRef.current.addEventListener("ended", () => {
          next();
        });
      }
      audioRef.current.src = currentTrack.previewUrl;
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  }, [currentTrack?.id, currentTrack?.source, currentTrack?.previewUrl, isPlaying, next, setProgress, setDuration, stopYTProgressPolling]);

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
    audioRef.current.volume = volume;
  }, [volume]);

  // Handle seek requests from UI
  useEffect(() => {
    if (seekPosition === null) return;
    if (currentTrack?.source === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      try { ytPlayerRef.current.seekTo(seekPosition, true); } catch {}
    } else if (currentTrack?.source === "itunes" && audioRef.current) {
      audioRef.current.currentTime = seekPosition;
    }
    clearSeek();
  }, [seekPosition, currentTrack?.source, clearSeek]);

  // Render only the hidden YouTube player div
  return (
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
  );
}

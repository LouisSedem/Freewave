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
 * Fetches a direct YouTube audio URL from our server-side extraction endpoint.
 * Returns null if the server can't extract it.
 */
async function fetchServerAudioUrl(
  videoId: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch(`/api/stream/${videoId}`, {
      signal: signal || AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/**
 * PlaybackEngine — dual-mode audio playback.
 *
 * For YouTube tracks:
 *   1. FIRST tries native <audio> with server-extracted audio URL (enables background playback)
 *   2. FALLS BACK to YouTube IFrame if extraction fails (always works, full tracks)
 *
 * For iTunes tracks:
 *   Uses <audio> with preview URL (30s).
 *
 * The IFrame player is always initialized as a hot standby.
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

  // Audio element — used for server-extracted YouTube audio AND iTunes previews
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // YouTube IFrame player refs (fallback)
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const apiLoadedRef = useRef(false);

  // Track which mode is active: "audio" = native <audio>, "iframe" = YouTube IFrame, "itunes" = iTunes preview
  const playbackModeRef = useRef<"audio" | "iframe" | "itunes">("iframe");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingUrlRef = useRef(false);

  // ─── Audio element (native) management ───────────────────────────

  const getOrCreateAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";

      audio.addEventListener("timeupdate", () => {
        if (audioRef.current) setProgress(audioRef.current.currentTime);
      });
      audio.addEventListener("loadedmetadata", () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
      });
      audio.addEventListener("durationchange", () => {
        if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      });
      audio.addEventListener("ended", () => {
        console.log("[FreeWave] <audio> track ended, playing next");
        next();
      });
      audio.addEventListener("error", () => {
        console.warn("[FreeWave] <audio> error, code:", audioRef.current?.error?.code);
        // If we're in audio mode and it fails, fall back to IFrame
        if (playbackModeRef.current === "audio") {
          const track = usePlayerStore.getState().currentTrack;
          if (track?.source === "youtube" && track.videoId) {
            console.log("[FreeWave] Falling back to YouTube IFrame");
            playbackModeRef.current = "iframe";
            loadViaIFrame(track.videoId);
          }
        }
      });

      audioRef.current = audio;
    }
    return audioRef.current;
  }, [setProgress, setDuration, next]);

  // ─── YouTube IFrame management ───────────────────────────────────

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
        } catch {}
      }
    }, 250);
  }, [setProgress, setDuration]);

  const stopYTProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const loadViaIFrame = useCallback((videoId: string) => {
    // Stop any native audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
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
          console.error("[FreeWave] IFrame load failed:", e);
        }
      } else if (retries < 50) {
        retries++;
        setTimeout(tryLoadVideo, 200);
      }
    };
    tryLoadVideo();
  }, [setDuration, setProgress, stopYTProgressPolling]);

  // Expose methods on store for external components
  useEffect(() => {
    usePlayerStore.setState({
      _seekToYt: (seconds: number) => {
        if (playbackModeRef.current === "iframe") {
          const player = ytPlayerRef.current;
          if (player && ytReadyRef.current) {
            try { player.seekTo(seconds, true); } catch {}
          }
        }
      },
      _seekToAudio: (seconds: number) => {
        if (playbackModeRef.current !== "iframe" && audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
      _stopYtPolling: stopYTProgressPolling,
    });
  }, [stopYTProgressPolling]);

  // Load YouTube IFrame API once (always available as fallback)
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

  // Reset video ref when track changes entirely
  useEffect(() => {
    currentVideoIdRef.current = null;
  }, [currentTrack?.id]);

  // ─── Handle YouTube track changes ───────────────────────────────
  useEffect(() => {
    const videoId = currentTrack?.videoId;
    if (!videoId || currentTrack?.source !== "youtube") return;
    if (currentVideoIdRef.current === videoId) return;
    currentVideoIdRef.current = videoId;

    setProgress(0);
    setDuration(currentTrack.duration || 0);

    // Abort any pending fetch
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strategy: Try native <audio> first (for background), fall back to IFrame
    const audio = getOrCreateAudio();

    // Stop IFrame if it was playing
    stopYTProgressPolling();
    try {
      if (ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.stopVideo();
      }
    } catch {}

    isFetchingUrlRef.current = true;

    // Attempt 1: Server-side audio extraction → native <audio>
    fetchServerAudioUrl(videoId, controller.signal)
      .then((audioUrl) => {
        if (controller.signal.aborted) return;
        isFetchingUrlRef.current = false;

        // Double-check track hasn't changed
        const current = usePlayerStore.getState().currentTrack;
        if (!current || current.videoId !== videoId) return;

        if (audioUrl) {
          console.log("[FreeWave] Using native <audio> for background playback");
          playbackModeRef.current = "audio";
          audio.src = audioUrl;
          if (usePlayerStore.getState().isPlaying) {
            audio.play().catch(() => {});
          }
        } else {
          // Fallback to YouTube IFrame
          console.log("[FreeWave] Server extraction failed, using IFrame");
          playbackModeRef.current = "iframe";
          loadViaIFrame(videoId);
        }
      })
      .catch(() => {
        isFetchingUrlRef.current = false;
        if (!controller.signal.aborted) {
          console.log("[FreeWave] Audio URL fetch error, using IFrame");
          playbackModeRef.current = "iframe";
          loadViaIFrame(videoId);
        }
      });
  }, [currentTrack?.videoId, currentTrack?.source, currentTrack?.duration, setDuration, setProgress, stopYTProgressPolling, getOrCreateAudio, loadViaIFrame]);

  // ─── Sync play/pause ────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    if (playbackModeRef.current === "iframe") {
      // YouTube IFrame
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;
      if (currentTrack.source !== "youtube") return;
      try {
        if (isPlaying) player.playVideo();
        else player.pauseVideo();
      } catch {}
    } else {
      // Native <audio>
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // ─── Sync volume ────────────────────────────────────────────────
  useEffect(() => {
    if (playbackModeRef.current === "iframe") {
      const player = ytPlayerRef.current;
      if (!player || !ytReadyRef.current) return;
      try { player.setVolume(Math.round(volume * 100)); } catch {}
    } else if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // ─── Handle iTunes track changes ────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.source !== "itunes") return;

    // Stop IFrame
    stopYTProgressPolling();
    try {
      if (ytPlayerRef.current && ytReadyRef.current) {
        ytPlayerRef.current.stopVideo();
      }
    } catch {}

    if (currentTrack.previewUrl) {
      playbackModeRef.current = "itunes";
      const audio = getOrCreateAudio();
      audio.src = currentTrack.previewUrl;
      if (isPlaying) audio.play().catch(() => {});
    }
  }, [currentTrack?.id, currentTrack?.source, currentTrack?.previewUrl, isPlaying, stopYTProgressPolling, getOrCreateAudio]);

  // ─── Handle seek requests ──────────────────────────────────────
  useEffect(() => {
    if (seekPosition === null) return;

    if (playbackModeRef.current === "iframe") {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try { ytPlayerRef.current.seekTo(seekPosition, true); } catch {}
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = seekPosition;
    }
    clearSeek();
  }, [seekPosition, clearSeek]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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

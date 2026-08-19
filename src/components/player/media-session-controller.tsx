"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore, type Track } from "@/store/player-store";

/**
 * Sets up Media Session API for lock screen / notification controls
 * and helps keep audio alive when the PWA is backgrounded.
 * Mounted inside AppLayout (client component) so it only runs in the browser.
 */
export function MediaSessionController() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const lastTrackIdRef = useRef<string | null>(null);

  // Update metadata when track changes
  const updateMetadata = useCallback((track: Track) => {
    if (lastTrackIdRef.current === track.id) return;
    lastTrackIdRef.current = track.id;
    if (!navigator.mediaSession) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || "FreeWave",
        artwork: track.artwork
          ? [
              { src: track.artwork, sizes: "300x300", type: "image/jpeg" },
              { src: track.artwork, sizes: "96x96", type: "image/jpeg" },
            ]
          : [],
      });
    } catch (e) {
      console.warn("[FreeWave] MediaSession metadata error:", e);
    }
  }, []);

  // Update metadata whenever track changes
  useEffect(() => {
    if (!currentTrack) return;
    updateMetadata(currentTrack);
  }, [currentTrack, updateMetadata]);

  // Reset when track is cleared
  useEffect(() => {
    if (!currentTrack) {
      lastTrackIdRef.current = null;
      if (navigator.mediaSession?.metadata) {
        try { navigator.mediaSession.metadata = null; } catch {}
      }
    }
  }, [currentTrack]);

  // Set up action handlers (once)
  useEffect(() => {
    if (!navigator.mediaSession) return;
    const ms = navigator.mediaSession;

    const setHandlers = () => {
      try {
        ms.setActionHandler("play", () => usePlayerStore.getState().resume());
        ms.setActionHandler("pause", () => usePlayerStore.getState().pause());
        ms.setActionHandler("toggleplay", () => usePlayerStore.getState().togglePlay());
        ms.setActionHandler("nexttrack", () => usePlayerStore.getState().next());
        ms.setActionHandler("previoustrack", () => usePlayerStore.getState().previous());
        ms.setActionHandler("seekto", (details: MediaSessionActionDetails) => {
          if (details.seekTime !== undefined) {
            usePlayerStore.getState().seekTo(details.seekTime);
          }
        });
      } catch (e) {
        console.warn("[FreeWave] MediaSession handler error:", e);
      }
    };

    setHandlers();

    // YouTube IFrame may override our handlers when a video loads,
    // so re-assert after a short delay whenever track changes
    const interval = setInterval(setHandlers, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update playback state
  useEffect(() => {
    if (!navigator.mediaSession) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [isPlaying]);

  // Update position state (progress bar in notification)
  useEffect(() => {
    if (!navigator.mediaSession) return;
    if (duration > 0 && !isNaN(duration) && isFinite(duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.max(0, Math.min(progress, duration)),
        });
      } catch {}
    }
  }, [progress, duration]);

  // Re-assert metadata when playback state changes (YouTube may override)
  useEffect(() => {
    if (currentTrack && isPlaying) {
      // Small delay to let YouTube set its session, then override
      const t = setTimeout(() => updateMetadata(currentTrack), 500);
      return () => clearTimeout(t);
    }
  }, [currentTrack?.id, isPlaying, currentTrack, updateMetadata]);

  return null;
}

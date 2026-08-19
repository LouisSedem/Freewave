"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore, type Track } from "@/store/player-store";

/**
 * Sets up Media Session API for lock screen / notification controls.
 * Works natively with the <audio> element in PlaybackEngine.
 * No YouTube IFrame workarounds needed anymore.
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
              { src: track.artwork, sizes: "512x512", type: "image/jpeg" },
              { src: track.artwork, sizes: "192x192", type: "image/jpeg" },
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
      ms.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 10;
        const current = usePlayerStore.getState().progress;
        usePlayerStore.getState().seekTo(Math.max(0, current - offset));
      });
      ms.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 10;
        const current = usePlayerStore.getState().progress;
        const dur = usePlayerStore.getState().duration;
        usePlayerStore.getState().seekTo(Math.min(dur, current + offset));
      });
    } catch (e) {
      console.warn("[FreeWave] MediaSession handler error:", e);
    }
  }, []);

  // Update playback state
  useEffect(() => {
    if (!navigator.mediaSession) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}
  }, [isPlaying]);

  // Update position state (progress bar in lock screen notification)
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

  return null;
}

"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { usePlayerStore, type Track } from "@/store/player-store";

// ─── Piped API instances (fallback chain) ──────────────────────────────
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.in.projectsegfau.lt",
];

interface PipedStream {
  url: string;
  mimeType?: string;
  bitrate?: number;
  quality?: string;
  contentLength?: number;
}

interface PipedStreamsResponse {
  title?: string;
  uploader?: string;
  uploaderUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  audioStreams?: PipedStream[];
  videoStreams?: PipedStream[];
  errorMessage?: string;
}

/**
 * Fetches a direct audio URL for a YouTube video via Piped API.
 * Tries multiple instances with timeout. Returns null if all fail.
 */
async function fetchAudioUrlFromPiped(
  videoId: string,
  signal?: AbortSignal
): Promise<string | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Link the external signal if provided
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      const res = await fetch(
        `${instance}/streams/${videoId}`,
        { signal: combinedSignal }
      );
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data: PipedStreamsResponse = await res.json();
      if (data.errorMessage || !data.audioStreams?.length) continue;

      // Sort by bitrate descending, prefer mp4/m4a codecs
      const sorted = [...data.audioStreams].sort((a, b) => {
        const aMp4 = a.mimeType?.includes("audio/mp4") ? 1 : 0;
        const bMp4 = b.mimeType?.includes("audio/mp4") ? 1 : 0;
        if (aMp4 !== bMp4) return bMp4 - aMp4;
        return (b.bitrate || 0) - (a.bitrate || 0);
      });

      // Prefer m4a/mp4 audio (widest browser support), fallback to webm/opus
      const best = sorted[0];
      if (best?.url) {
        console.log(
          `[FreeWave] Got audio URL from ${instance}, format: ${best.mimeType}, bitrate: ${best.bitrate}`
        );
        return best.url;
      }
    } catch (e) {
      console.warn(`[FreeWave] Piped instance ${instance} failed:`, e);
    }
  }
  return null;
}

/**
 * PlaybackEngine — handles ALL audio via native <audio> element.
 * YouTube audio is fetched through Piped API (direct URLs, no IFrame).
 * This enables background playback on mobile when installed as PWA.
 *
 * Renders no visible UI. All state is read from the player store.
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Initialize the audio element once
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";

      // Event listeners
      audio.addEventListener("timeupdate", () => {
        setProgress(audio.currentTime);
      });
      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });
      audio.addEventListener("durationchange", () => {
        if (audio.duration && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      });
      audio.addEventListener("ended", () => {
        console.log("[FreeWave] Track ended, playing next");
        retryCountRef.current = 0;
        next();
      });
      audio.addEventListener("error", (e) => {
        const mediaErr = audio.error;
        console.warn(
          "[FreeWave] Audio error:",
          mediaErr?.message,
          "code:",
          mediaErr?.code
        );

        // If we haven't retried much and the track is YouTube-based,
        // try to refetch the audio URL (might have expired)
        const track = usePlayerStore.getState().currentTrack;
        if (
          track?.source === "youtube" &&
          track.videoId &&
          retryCountRef.current < 2
        ) {
          retryCountRef.current++;
          console.log(
            `[FreeWave] Retrying audio fetch (attempt ${retryCountRef.current})`
          );
          loadAudioForTrack(track);
        }
      });
      audio.addEventListener("waiting", () => {
        // Buffering — could show a spinner via store if needed
      });
      audio.addEventListener("playing", () => {
        retryCountRef.current = 0;
      });

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [setProgress, setDuration, next]);

  // Load audio URL for a track (YouTube via Piped, iTunes direct)
  const loadAudioForTrack = useCallback(
    async (track: Track) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Abort any pending fetch
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (track.source === "itunes" && track.previewUrl) {
        // iTunes preview — direct URL, just play it
        audio.src = track.previewUrl;
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => {});
        }
      } else if (track.source === "youtube" && track.videoId) {
        // YouTube — fetch direct audio URL via Piped API
        isFetchingRef.current = true;
        const audioUrl = await fetchAudioUrlFromPiped(
          track.videoId,
          controller.signal
        );
        isFetchingRef.current = false;

        // Check if track changed while we were fetching
        const current = usePlayerStore.getState().currentTrack;
        if (!current || current.id !== track.id) return;
        if (controller.signal.aborted) return;

        if (audioUrl) {
          audio.src = audioUrl;
          if (usePlayerStore.getState().isPlaying) {
            audio.play().catch(() => {});
          }
        } else {
          console.error(
            "[FreeWave] Could not get audio URL from any Piped instance for:",
            track.videoId
          );
          // Could show an error toast here
        }
      }
    },
    []
  );

  // Expose seekTo for external components via store
  useEffect(() => {
    usePlayerStore.setState({
      _seekToAudio: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
      _seekToYt: () => {}, // no-op, no more YouTube IFrame
      _stopYtPolling: () => {}, // no-op
    });
  }, []);

  // Handle track changes
  useEffect(() => {
    if (!currentTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      currentTrackIdRef.current = null;
      return;
    }

    if (currentTrackIdRef.current === currentTrack.id) return;
    currentTrackIdRef.current = currentTrack.id;
    retryCountRef.current = 0;

    // Reset progress/duration for new track
    setProgress(0);
    setDuration(0);

    // If track has a known duration (from search results), set it immediately
    if (currentTrack.duration) {
      setDuration(currentTrack.duration);
    }

    loadAudioForTrack(currentTrack);
  }, [currentTrack?.id, currentTrack, loadAudioForTrack, setProgress, setDuration]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch((e) => {
        console.warn("[FreeWave] play() blocked:", e.message);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle seek requests from UI
  useEffect(() => {
    if (seekPosition === null) return;
    if (audioRef.current) {
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

  // Render nothing visible — audio element is created programmatically
  return null;
}

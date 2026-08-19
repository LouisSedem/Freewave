// FreeWave Music Store - Zustand state management
import { create } from "zustand";
import { searchYouTubeViaProxy } from "@/lib/api";

export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  source: "youtube" | "itunes";
  videoId: string | null;
  duration: number | null;
  previewUrl?: string;
  album?: string;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  isUpgrading: boolean;
  seekPosition: number | null;
  playTrack: (track: Track, queue?: Track[]) => void;
  upgradeTrackToYouTube: (videoId: string, duration: number | null) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (seconds: number) => void;
  clearSeek: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
  // Internal: set by PlaybackEngine for direct access
  _seekToAudio: (seconds: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: "off",
  isUpgrading: false,
  seekPosition: null,
  _seekToAudio: () => {},

  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const index = newQueue.findIndex((t) => t.id === track.id);

    // If this is an iTunes track without a videoId, try to upgrade it client-side
    if (track.source === "itunes" && !track.videoId) {
      set({
        currentTrack: track,
        queue: newQueue,
        queueIndex: index >= 0 ? index : 0,
        isPlaying: true,
        progress: 0,
        isUpgrading: true,
      });

      // Client-side YouTube lookup via CORS proxy (no server involved)
      const query = `${track.artist} ${track.title} official audio`;
      searchYouTubeViaProxy(query, 1)
        .then((results) => {
          if (results.length > 0 && results[0].videoId) {
            const yt = results[0];
            const upgraded: Track = {
              ...track,
              source: "youtube",
              videoId: yt.videoId,
              duration: yt.duration || track.duration,
            };
            const { queueIndex: qi } = get();
            set((state) => {
              const updatedQueue = [...state.queue];
              if (qi >= 0 && qi < updatedQueue.length) {
                updatedQueue[qi] = upgraded;
              }
              return { currentTrack: upgraded, queue: updatedQueue, isUpgrading: false };
            });
          } else {
            set({ isUpgrading: false });
          }
        })
        .catch(() => set({ isUpgrading: false }));
    } else {
      set({
        currentTrack: track,
        queue: newQueue,
        queueIndex: index >= 0 ? index : 0,
        isPlaying: true,
        progress: 0,
        isUpgrading: false,
      });
    }
  },

  upgradeTrackToYouTube: (videoId, duration) => {
    const { currentTrack, queueIndex } = get();
    if (!currentTrack) return;
    const upgraded: Track = { ...currentTrack, source: "youtube", videoId, duration: duration || currentTrack.duration };
    set((state) => {
      const updatedQueue = [...state.queue];
      if (queueIndex >= 0 && queueIndex < updatedQueue.length) updatedQueue[queueIndex] = upgraded;
      return { currentTrack: upgraded, queue: updatedQueue };
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;
    if (shuffle) {
      const i = Math.floor(Math.random() * queue.length);
      set({ queueIndex: i, currentTrack: queue[i], progress: 0, isPlaying: true });
    } else if (queueIndex < queue.length - 1) {
      set({ queueIndex: queueIndex + 1, currentTrack: queue[queueIndex + 1], progress: 0, isPlaying: true });
    } else if (repeat === "all") {
      set({ queueIndex: 0, currentTrack: queue[0], progress: 0, isPlaying: true });
    } else {
      set({ isPlaying: false });
    }
  },

  previous: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;
    if (progress > 3) { set({ progress: 0 }); }
    else if (queueIndex > 0) { set({ queueIndex: queueIndex - 1, currentTrack: queue[queueIndex - 1], progress: 0 }); }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  seekTo: (seconds) => set({ seekPosition: seconds }),
  clearSeek: () => set({ seekPosition: null }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),
}));

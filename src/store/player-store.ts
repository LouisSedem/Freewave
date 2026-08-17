// FreeWave Music Store - Zustand state management
import { create } from "zustand";

export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  source: "youtube" | "itunes";
  videoId: string | null;
  duration: number | null;
  album?: string;
}

export interface PlayerState {
  // Current track
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;

  // Player state
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;

  // Shuffle & repeat
  shuffle: boolean;
  repeat: "off" | "all" | "one";

  // Actions
  playTrack: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
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

  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const index = newQueue.findIndex((t) => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      queueIndex: index >= 0 ? index : 0,
      isPlaying: true,
      progress: 0,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      set({ queueIndex: randomIndex, currentTrack: queue[randomIndex], progress: 0, isPlaying: true });
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
    if (progress > 3) {
      set({ progress: 0 });
    } else if (queueIndex > 0) {
      set({ queueIndex: queueIndex - 1, currentTrack: queue[queueIndex - 1], progress: 0 });
    }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
    })),

  addToQueue: (track) =>
    set((s) => ({
      queue: [...s.queue, track],
    })),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),
}));

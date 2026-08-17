// FreeWave Music Store - Zustand state management
import { create } from "zustand";

// Client-side YouTube videoId lookup via JSONP (bypasses CORS + server IP blocks)
function lookupYouTubeVideoId(title: string, artist: string): Promise<{ videoId: string | null; duration: number | null }> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return Promise.resolve({ videoId: null, duration: null });

  return new Promise((resolve) => {
    const cb = "__ytLU_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => { cleanup(); resolve({ videoId: null, duration: null }); }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as Record<string, unknown>)[cb];
      document.getElementById(cb)?.remove();
    }

    (window as Record<string, unknown>)[cb] = (data: Record<string, unknown>) => {
      cleanup();
      const items = (data.items || []) as Array<Record<string, unknown>>;
      const item = items[0];
      const vid = (item?.id as Record<string, unknown>)?.videoId as string | undefined;
      resolve({ videoId: vid || null, duration: null });
    };

    const params = new URLSearchParams({
      part: "snippet",
      q: `${artist} ${title} official audio`,
      type: "video",
      maxResults: "1",
      key: apiKey,
      callback: cb,
    });

    const script = document.createElement("script");
    script.id = cb;
    script.src = `https://www.googleapis.com/youtube/v3/search?${params}`;
    script.onerror = () => { cleanup(); resolve({ videoId: null, duration: null }); };
    document.head.appendChild(script);
  });
}

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

  // Upgrade state
  isUpgrading: boolean;

  // Actions
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
  isUpgrading: false,

  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const index = newQueue.findIndex((t) => t.id === track.id);

    // If this is an iTunes track without a videoId, try to upgrade it
    if (track.source === "itunes" && !track.videoId) {
      // Set the track immediately (will play 30s preview as fallback)
      set({
        currentTrack: track,
        queue: newQueue,
        queueIndex: index >= 0 ? index : 0,
        isPlaying: true,
        progress: 0,
        isUpgrading: true,
      });

      // Fire-and-forget: try to find YouTube videoId via JSONP (client-side)
      lookupYouTubeVideoId(track.title, track.artist).then((data) => {
          if (data.videoId) {
            // Upgrade the current track AND the queue entry
            const upgraded: Track = {
              ...track,
              source: "youtube",
              videoId: data.videoId,
              duration: data.duration || track.duration,
            };
            const { queueIndex: qi } = get();
            set((state) => {
              const updatedQueue = [...state.queue];
              if (qi >= 0 && qi < updatedQueue.length) {
                updatedQueue[qi] = upgraded;
              }
              return {
                currentTrack: upgraded,
                queue: updatedQueue,
                isUpgrading: false,
              };
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
    const upgraded: Track = {
      ...currentTrack,
      source: "youtube",
      videoId,
      duration: duration || currentTrack.duration,
    };
    set((state) => {
      const updatedQueue = [...state.queue];
      if (queueIndex >= 0 && queueIndex < updatedQueue.length) {
        updatedQueue[queueIndex] = upgraded;
      }
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

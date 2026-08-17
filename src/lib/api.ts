// FreeWave API utilities

export interface ITunesSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
  kind: string;
}

export interface SearchResults {
  tracks: Track[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  source: "youtube" | "itunes";
  videoId: string | null;
  duration: number | null;
  album?: string;
  previewUrl?: string;
}

// Search iTunes API for songs
export async function searchITunes(query: string, limit = 12): Promise<Track[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}&entity=song`
    );
    const data = await res.json();
    return (data.results || [])
      .filter((r: ITunesSearchResult) => r.kind === "song")
      .map((r: ITunesSearchResult) => ({
        id: `itunes-${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        artwork: r.artworkUrl100.replace("100x100", "300x300"),
        source: "itunes" as const,
        videoId: null,
        duration: Math.round(r.trackTimeMillis / 1000),
        album: r.collectionName,
        previewUrl: r.previewUrl,
      }));
  } catch (e) {
    console.error("iTunes search failed:", e);
    return [];
  }
}

// Search YouTube via server-side Invidious proxy
export async function searchYouTube(query: string, maxResults = 6): Promise<Track[]> {
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}&limit=${maxResults}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tracks || []) as Track[];
  } catch (e) {
    console.error("YouTube search failed:", e);
    return [];
  }
}

// Combined search: iTunes (with previews) + YouTube (full playback)
export async function searchAll(query: string): Promise<Track[]> {
  const [itunesResults, youtubeResults] = await Promise.all([
    searchITunes(query, 12),
    searchYouTube(query, 6).catch(() => []),
  ]);

  // Merge results — iTunes first (has previews), then YouTube
  return [...itunesResults, ...youtubeResults];
}

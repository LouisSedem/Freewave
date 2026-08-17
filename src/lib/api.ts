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
export async function searchITunes(query: string, limit = 10): Promise<Track[]> {
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

// Search YouTube via Invidious API (server-side proxy)
export async function searchYouTube(query: string, maxResults = 10): Promise<Track[]> {
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

// Fuzzy match: check if two strings share enough words to be considered the same song
function stringsMatch(a: string, b: string, threshold = 0.4): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return false;

  // Count how many words from A appear in B
  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) matches++;
  }

  // Also check partial matches (e.g. "lovin" matches "loving")
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      if (
        wordA !== wordB &&
        (wordA.startsWith(wordB) || wordB.startsWith(wordA)) &&
        Math.abs(wordA.length - wordB.length) <= 2
      ) {
        matches += 0.5;
      }
    }
  }

  const score = matches / Math.max(wordsA.size, wordsB.size);
  return score >= threshold;
}

// Combined search with smart merge: YouTube videoIds + iTunes metadata = full tracks
export async function searchAll(query: string): Promise<Track[]> {
  const [youtubeResults, itunesResults] = await Promise.all([
    searchYouTube(query, 12).catch(() => []),
    searchITunes(query, 10),
  ]);

  // Build a map of videoId -> YouTube track for quick lookup
  const ytByVideoId = new Map<string, Track>();
  for (const yt of youtubeResults) {
    if (yt.videoId) ytByVideoId.set(yt.videoId, yt);
  }

  // Step 1: Upgrade iTunes tracks with matching YouTube videoIds
  // This gives us: iTunes artwork quality + YouTube full-track playback
  const usedVideoIds = new Set<string>();
  const upgradedITunes: Track[] = itunesResults.map((itunes) => {
    // Try to find a matching YouTube video
    for (const yt of youtubeResults) {
      if (usedVideoIds.has(yt.videoId || "")) continue;

      const titleMatch = stringsMatch(itunes.title, yt.title, 0.35);
      const artistMatch = stringsMatch(itunes.artist, yt.artist, 0.3);

      if (titleMatch && (artistMatch || yt.artist.toLowerCase().includes(itunes.artist.toLowerCase().split(" ")[0]))) {
        usedVideoIds.add(yt.videoId || "");
        return {
          ...itunes,
          source: "youtube" as const,
          videoId: yt.videoId,
          // Keep iTunes duration (more accurate), use YouTube duration as fallback
          duration: itunes.duration || yt.duration,
        };
      }
    }
    return itunes;
  });

  // Step 2: Add remaining YouTube results that weren't matched
  const unmatchedYouTube = youtubeResults.filter(
    (yt) => !usedVideoIds.has(yt.videoId || "")
  );

  // Step 3: Combine - upgraded iTunes first (best of both), then unmatched YouTube, then pure iTunes
  const upgraded = upgradedITunes.filter((t) => t.source === "youtube");
  const pureITunes = upgradedITunes.filter((t) => t.source === "itunes");

  return [...upgraded, ...unmatchedYouTube, ...pureITunes];
}

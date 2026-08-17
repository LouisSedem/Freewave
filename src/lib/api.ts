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

// Search iTunes API for songs (client-side, always works)
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

// Search YouTube via JSONP (client-side, bypasses CORS + IP blocks)
function searchYouTubeJSONP(query: string, maxResults = 10): Promise<Track[]> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return Promise.resolve([]);

  return new Promise((resolve) => {
    const callbackName = "__ytSearch_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 12000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as Record<string, unknown>)[callbackName];
      const el = document.getElementById(callbackName);
      if (el) el.remove();
    }

    (window as Record<string, unknown>)[callbackName] = (data: Record<string, unknown>) => {
      cleanup();
      const items = (data.items || []) as Array<Record<string, unknown>>;
      const tracks: Track[] = items
        .filter((item) => (item.id as Record<string, unknown>)?.kind === "youtube#video")
        .map((item) => {
          const id = (item.id as Record<string, unknown>).videoId as string;
          const snippet = item.snippet as Record<string, unknown>;
          const thumbs = snippet?.thumbnails as Record<string, Record<string, string>> | undefined;
          const thumb = thumbs?.medium || thumbs?.high || thumbs?.default;

          return {
            id: `yt-${id}`,
            title: cleanYTTitle((snippet?.title as string) || ""),
            artist: ((snippet?.channelTitle as string) || "Unknown")
              .replace(/ - Topic$/, "")
              .replace(/VEVO$/, "VEVO"),
            artwork: thumb?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            source: "youtube" as const,
            videoId: id,
            duration: null,
            previewUrl: null,
          };
        });
      resolve(tracks);
    };

    const params = new URLSearchParams({
      part: "snippet",
      q: query + " music audio",
      type: "video",
      maxResults: String(maxResults),
      key: apiKey,
      callback: callbackName,
    });

    const script = document.createElement("script");
    script.id = callbackName;
    script.src = `https://www.googleapis.com/youtube/v3/search?${params}`;
    script.onerror = () => { cleanup(); resolve([]); };
    document.head.appendChild(script);
  });
}

// Fuzzy match: check if two strings share enough words
function stringsMatch(a: string, b: string, threshold = 0.4): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 1);
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) matches++;
  }
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      if (wordA !== wordB && (wordA.startsWith(wordB) || wordB.startsWith(wordA)) && Math.abs(wordA.length - wordB.length) <= 2) {
        matches += 0.5;
      }
    }
  }
  return matches / Math.max(wordsA.size, wordsB.size) >= threshold;
}

function cleanYTTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/".*?"/g, "")
    .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip|performance|live).*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Combined search with smart merge
export async function searchAll(query: string): Promise<Track[]> {
  const [youtubeResults, itunesResults] = await Promise.all([
    searchYouTubeJSONP(query, 12).catch(() => []),
    searchITunes(query, 10),
  ]);

  // If no YouTube key configured, return iTunes only
  if (youtubeResults.length === 0) return itunesResults;

  // Smart merge: match iTunes tracks with YouTube results to get videoIds
  const usedVideoIds = new Set<string>();
  const upgradedITunes: Track[] = itunesResults.map((itunes) => {
    for (const yt of youtubeResults) {
      if (usedVideoIds.has(yt.videoId || "")) continue;
      const titleMatch = stringsMatch(itunes.title, yt.title, 0.35);
      const artistMatch = stringsMatch(itunes.artist, yt.artist, 0.3);
      if (titleMatch && (artistMatch || yt.artist.toLowerCase().includes(itunes.artist.toLowerCase().split(" ")[0]))) {
        usedVideoIds.add(yt.videoId || "");
        return { ...itunes, source: "youtube" as const, videoId: yt.videoId, duration: itunes.duration || yt.duration };
      }
    }
    return itunes;
  });

  const unmatchedYouTube = youtubeResults.filter((yt) => !usedVideoIds.has(yt.videoId || ""));
  const upgraded = upgradedITunes.filter((t) => t.source === "youtube");
  const pureITunes = upgradedITunes.filter((t) => t.source === "itunes");

  return [...upgraded, ...unmatchedYouTube, ...pureITunes];
}

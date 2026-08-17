// FreeWave API utilities

// CORS proxies that work from the browser to fetch YouTube HTML
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

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

// ─── iTunes Search (client-side, always works) ────────────────────────
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

// ─── YouTube Search (client-side via CORS proxy + ytInitialData parsing) ──
interface ParsedYTVideo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number | null;
}

function parseYTInitialData(html: string, max: number): ParsedYTVideo[] {
  try {
    // Extract ytInitialData JSON blob from YouTube HTML
    const match = html.match(/var ytInitialData = ({.+?});\s*<\/script>/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const videos: ParsedYTVideo[] = [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (videos.length >= max) break;
        if (item.adSlotRenderer) continue;

        const vr = item.videoRenderer;
        if (!vr?.videoId) continue;

        const titleRuns = vr.title?.runs || [];
        const title = titleRuns[0]?.text || "";
        const channelRuns = vr.longBylineText?.runs || [];
        const artist = channelRuns[0]?.text || "";
        const thumbs = vr.thumbnail?.thumbnails || [];
        const thumbnail = thumbs.length > 1 ? thumbs[1].url : thumbs[0]?.url || "";
        const lengthStr = vr.lengthText?.simpleText || "";

        if (title) {
          const dur = parseYTDuration(lengthStr);
          videos.push({ videoId: vr.videoId, title, artist, thumbnail, duration: dur });
        }
      }
    }
    return videos;
  } catch {
    return [];
  }
}

function parseYTDuration(dur: string): number | null {
  if (!dur) return null;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function cleanYTTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/".*?"/g, "")
    .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip|performance|live|explicit|remastered).*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanYTArtist(author: string): string {
  return (
    author
      .replace(/ - Topic$/, "")
      .replace(/VEVO$/, "VEVO")
      .replace(/\s+/g, " ")
      .trim() || "Unknown"
  );
}

// Fetch YouTube HTML through a CORS proxy, parse it client-side
async function searchYouTubeViaProxy(query: string, maxResults = 10): Promise<Track[]> {
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " music audio")}`;

  // Try CORS proxies in order
  for (const makeProxyUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxyUrl(ytUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;

      const html = await res.text();
      if (html.length < 10000) continue; // Too small, probably an error page

      const parsed = parseYTInitialData(html, maxResults);
      if (parsed.length === 0) continue;

      return parsed
        .filter((v) => {
          if (v.duration !== null && (v.duration < 60 || v.duration > 600)) return false;
          return true;
        })
        .map((v) => ({
          id: `yt-${v.videoId}`,
          title: cleanYTTitle(v.title),
          artist: cleanYTArtist(v.artist),
          artwork: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          source: "youtube" as const,
          videoId: v.videoId,
          duration: v.duration,
          previewUrl: null,
        }));
    } catch {
      // Try next proxy
    }
  }
  return [];
}

// ─── Fuzzy string matching for smart merge ────────────────────────────
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

// ─── Combined search with smart merge ─────────────────────────────────
export async function searchAll(query: string): Promise<Track[]> {
  const [youtubeResults, itunesResults] = await Promise.all([
    searchYouTubeViaProxy(query, 12).catch(() => []),
    searchITunes(query, 10),
  ]);

  // If no YouTube results, return iTunes-only (30s previews)
  if (youtubeResults.length === 0) return itunesResults;

  // Smart merge: match iTunes tracks with YouTube results to get videoIds
  // This gives: iTunes artwork quality + YouTube full-track playback
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

// Export for on-demand lookup (used by player-store)
export { searchYouTubeViaProxy };

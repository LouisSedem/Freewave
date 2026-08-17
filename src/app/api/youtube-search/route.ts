import { NextResponse } from "next/server";

// ─── Method 1: Direct YouTube HTML scraping (most reliable) ───────────
function extractVideoIds(html: string, max: number): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html)) !== null && ids.length < max) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

// Fetch metadata for a video via oEmbed
async function getVideoMeta(videoId: string): Promise<{
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
} | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "FreeWave/1.0" },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "",
        author: data.author_name || "",
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0, // oEmbed doesn't provide duration
      };
    }
  } catch {
    // skip
  }
  return null;
}

// Scrape YouTube search page for video IDs + metadata via oEmbed
async function searchViaYouTubeScrape(query: string, limit: number): Promise<Track[]> {
  const searchRes = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    {
      next: { revalidate: 0 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!searchRes.ok) return [];

  const html = await searchRes.text();
  const videoIds = extractVideoIds(html, limit);

  if (videoIds.length === 0) return [];

  // Fetch metadata via oEmbed in batches
  const BATCH = 4;
  const tracks: Track[] = [];

  for (let i = 0; i < videoIds.length; i += BATCH) {
    const batch = videoIds.slice(i, i + BATCH);
    const metas = await Promise.all(batch.map((id) => getVideoMeta(id)));

    for (let j = 0; j < batch.length; j++) {
      const videoId = batch[j];
      const meta = metas[j];
      tracks.push({
        id: `yt-${videoId}`,
        title: meta
          ? meta.title
              .replace(/\[.*?\]/g, "")
              .replace(/".*?"/g, "")
              .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip).*?\)/gi, "")
              .replace(/\s+/g, " ")
              .trim()
          : `YouTube Video`,
        artist: meta
          ? meta.author.replace(/ - Topic$/, "").replace(/VEVO$/, "VEVO")
          : "Unknown",
        artwork: meta?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source: "youtube" as const,
        videoId,
        duration: null,
        previewUrl: null,
      });
    }
  }

  return tracks;
}

// ─── Method 2: Invidious API (fallback) ───────────────────────────────
const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.fdn.fr",
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
];

interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  videoThumbnails: Array<{ url: string; width: number; height: number }>;
  lengthSeconds: number;
}

async function searchViaInvidious(query: string, limit: number): Promise<Track[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&page=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "FreeWave/1.0", Accept: "application/json" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const videos: InvidiousVideo[] = (data || [])
        .filter((item: Record<string, unknown>) => item.type === "video" && item.videoId)
        .slice(0, limit);

      if (videos.length > 0) {
        return videos.map((v) => ({
          id: `yt-${v.videoId}`,
          title: v.title
            .replace(/\[.*?\]/g, "")
            .replace(/".*?"/g, "")
            .replace(/\(.*?(official|audio|lyric|video).*?\)/gi, "")
            .replace(/\s+/g, " ")
            .trim(),
          artist: v.author.replace(/ - Topic$/, "").replace(/VEVO$/, "VEVO"),
          artwork: v.videoThumbnails?.length
            ? v.videoThumbnails.find((t) => t.width >= 320)?.url || v.videoThumbnails[0].url
            : `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          source: "youtube" as const,
          videoId: v.videoId,
          duration: v.lengthSeconds > 0 ? v.lengthSeconds : null,
          previewUrl: null,
        }));
      }
    } catch {
      // try next instance
    }
  }
  return [];
}

interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  source: "youtube";
  videoId: string;
  duration: number | null;
  previewUrl: null;
}

// GET /api/youtube-search?q=query&limit=10
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    // Try YouTube scrape first (most reliable), then Invidious as fallback
    const searchQuery = query + " music audio";
    let tracks = await searchViaYouTubeScrape(searchQuery, limit);

    if (tracks.length === 0) {
      tracks = await searchViaInvidious(searchQuery, limit);
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("YouTube search failed:", error);
    return NextResponse.json({ tracks: [] });
  }
}

import { NextResponse } from "next/server";

// Invidious instances to try (fallback chain)
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
  viewCount: number;
}

// Try fetching from Invidious instances with fallback
async function fetchFromInvidious(query: string, limit: number): Promise<InvidiousVideo[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&page=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "FreeWave/1.0",
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const videos: InvidiousVideo[] = (data || [])
        .filter((item: Record<string, unknown>) => item.type === "video" && item.videoId)
        .slice(0, limit);

      if (videos.length > 0) return videos;
    } catch {
      // Try next instance
    }
  }
  return [];
}

// Get best thumbnail from Invidious response
function getBestThumbnail(thumbnails: InvidiousVideo["videoThumbnails"]): string {
  if (!thumbnails || thumbnails.length === 0) return "";
  // Prefer medium quality
  const medium = thumbnails.find((t) => t.width >= 320 && t.width < 480);
  const high = thumbnails.find((t) => t.width >= 480);
  return (medium || high || thumbnails[0]).url;
}

// Clean up YouTube title (remove brackets, quotes, etc.)
function cleanTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/".*?"/g, "")
    .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip).*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Clean up artist name
function cleanArtist(author: string): string {
  return author
    .replace(/ - Topic$/, "")
    .replace(/VEVO$/, "VEVO")
    .replace(/\s+/g, " ")
    .trim();
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
    const videos = await fetchFromInvidious(query + " music audio", limit);

    if (videos.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = videos.map((video) => ({
      id: `yt-${video.videoId}`,
      title: cleanTitle(video.title),
      artist: cleanArtist(video.author),
      artwork: getBestThumbnail(video.videoThumbnails) || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
      source: "youtube" as const,
      videoId: video.videoId,
      duration: video.lengthSeconds > 0 ? video.lengthSeconds : null,
      previewUrl: null as null,
    }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("YouTube search failed:", error);
    return NextResponse.json({ tracks: [] });
  }
}

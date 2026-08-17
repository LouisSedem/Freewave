import { NextResponse } from "next/server";

const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.snopyta.org",
  "https://vid.puffyan.us",
  "https://invidious.kavin.rocks",
];

interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  videoThumbnails: { url: string; width: number; height: number }[];
  lengthSeconds: number;
}

async function searchInvidious(query: string, maxResults: number): Promise<InvidiousVideo[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query + " music")}&type=video&sort_by=relevance&limit=${maxResults}`,
        {
          next: { revalidate: 0 },
          headers: {
            "User-Agent": "FreeWave/1.0",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        return data.filter((item: InvidiousVideo) => item.videoId && item.title);
      }
    } catch {
      // Try next instance
    }
  }
  return [];
}

// GET /api/youtube-search?q=query&limit=12
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "12", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const results = await searchInvidious(query, limit);

    const tracks = results.map((item) => {
      const thumbnail =
        item.videoThumbnails?.find((t) => t.width >= 300) || item.videoThumbnails?.[0];
      // Use the Invidious instance URL to build a proxy-friendly thumbnail URL
      // Invidious thumbnails use relative or same-origin URLs
      let artworkUrl: string | null = null;
      if (thumbnail?.url) {
        // Invidious returns URLs like /vi/VIDEO_ID/maxres.jpg or full URLs
        if (thumbnail.url.startsWith("http")) {
          artworkUrl = thumbnail.url;
        } else if (thumbnail.url.startsWith("/")) {
          // Use ytimg which is publicly accessible
          artworkUrl = `https://i.ytimg.com${thumbnail.url}`;
        }
      }

      return {
        id: `yt-${item.videoId}`,
        title: item.title
          .replace(/\[.*?\]/g, "")
          .replace(/".*?"/g, "")
          .replace(/\(.*?\)/g, "")
          .replace(/\s+/g, " ")
          .trim(),
        artist: item.author.replace(/ - Topic$/, ""),
        artwork: artworkUrl,
        source: "youtube" as const,
        videoId: item.videoId,
        duration: item.lengthSeconds || null,
        previewUrl: null,
      };
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("YouTube search failed:", error);
    return NextResponse.json({ tracks: [] });
  }
}

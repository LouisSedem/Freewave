import { NextResponse } from "next/server";

// Quick lookup: find a single YouTube videoId for a song title + artist
// Used to upgrade iTunes tracks to full-track playback on-demand

// ─── Method 1: YouTube scrape (most reliable) ─────────────────────
function extractVideoIds(html: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html)) !== null && ids.length < 3) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      ids.push(m[1]);
    }
  }
  return ids;
}

async function lookupViaYouTubeScrape(query: string): Promise<{ videoId: string; duration: number | null } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!res.ok) return null;

    const html = await res.text();
    const videoIds = extractVideoIds(html);
    if (videoIds.length > 0) {
      return { videoId: videoIds[0], duration: null };
    }
  } catch {
    // fall through to Invidious
  }
  return null;
}

// ─── Method 2: Invidious fallback ─────────────────────────────────
const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.fdn.fr",
  "https://vid.puffyan.us",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
];

interface InvidiousVideo {
  videoId: string;
  lengthSeconds: number;
}

async function lookupViaInvidious(query: string): Promise<{ videoId: string; duration: number | null } | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&page=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "FreeWave/1.0", Accept: "application/json" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const videos: InvidiousVideo[] = (data || []).filter(
        (item: Record<string, unknown>) => item.type === "video" && item.videoId
      );

      if (videos.length > 0) {
        return {
          videoId: videos[0].videoId,
          duration: videos[0].lengthSeconds > 0 ? videos[0].lengthSeconds : null,
        };
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ videoId: null, duration: null });
  }

  const query = `${artist} ${title} official audio`;

  // Try YouTube scrape first, then Invidious
  const result = (await lookupViaYouTubeScrape(query)) || (await lookupViaInvidious(query));

  if (result) {
    return NextResponse.json(result);
  }

  return NextResponse.json({ videoId: null, duration: null });
}

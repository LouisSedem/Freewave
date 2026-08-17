import { NextResponse } from "next/server";

interface OEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

// Extract unique video IDs from YouTube search HTML
function extractVideoIds(html: string, max: number): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  // Primary pattern: "videoId":"XXXXXXX"
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

// Fetch metadata for a single video via oEmbed (no API key needed)
async function getVideoMeta(videoId: string): Promise<OEmbedResponse | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "FreeWave/1.0" },
      }
    );
    if (res.ok) return await res.json();
  } catch {
    // skip
  }
  return null;
}

// GET /api/youtube-search?q=query&limit=12
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    // Step 1: Scrape YouTube search page for video IDs
    const searchRes = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " music")}`,
      {
        next: { revalidate: 0 },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ tracks: [] });
    }

    const html = await searchRes.text();
    const videoIds = extractVideoIds(html, limit);

    if (videoIds.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Step 2: Fetch metadata (title, artist, thumbnail) via oEmbed for each ID
    // Do this in parallel with a concurrency limit
    const BATCH = 4;
    const metaResults: (OEmbedResponse | null)[] = [];

    for (let i = 0; i < videoIds.length; i += BATCH) {
      const batch = videoIds.slice(i, i + BATCH);
      const results = await Promise.all(batch.map((id) => getVideoMeta(id)));
      metaResults.push(...results);
    }

    // Step 3: Build track objects
    const tracks = videoIds.map((videoId, idx) => {
      const meta = metaResults[idx];
      return {
        id: `yt-${videoId}`,
        title: meta
          ? meta.title
              .replace(/\[.*?\]/g, "")
              .replace(/".*?"/g, "")
              .replace(/\(.*?\)/g, "")
              .replace(/\s+/g, " ")
              .trim()
          : `YouTube Video`,
        artist: meta ? meta.author_name.replace(/ - Topic$/, "").replace(/VEVO$/, "VEVO") : "Unknown",
        artwork: meta?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source: "youtube" as const,
        videoId,
        duration: null, // oEmbed doesn't return duration; YouTube player will report it
        previewUrl: null,
      };
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("YouTube search failed:", error);
    return NextResponse.json({ tracks: [] });
  }
}

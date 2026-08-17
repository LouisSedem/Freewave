import { NextResponse } from "next/server";

interface ParsedVideo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
}

function parseYtInitialData(html: string, max: number): ParsedVideo[] {
  try {
    const match = html.match(/var ytInitialData = ({.+?});\s*<\/script>/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    const videos: ParsedVideo[] = [];

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

        const length = vr.lengthText?.simpleText || "";

        if (title) {
          videos.push({ videoId: vr.videoId, title, artist, thumbnail, duration: length });
        }
      }
    }
    return videos;
  } catch {
    return [];
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/".*?"/g, "")
    .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip|performance|live|explicit|remastered).*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(author: string): string {
  return (
    author
      .replace(/ - Topic$/, "")
      .replace(/VEVO$/, "VEVO")
      .replace(/\s+/g, " ")
      .trim() || "Unknown"
  );
}

function parseDuration(dur: string): number | null {
  if (!dur) return null;
  const parts = dur.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " music audio")}`;
    const searchRes = await fetch(searchUrl, {
      next: { revalidate: 0 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!searchRes.ok) {
      console.error(`[FreeWave] YouTube HTTP ${searchRes.status}`);
      return NextResponse.json({ tracks: [] });
    }

    const html = await searchRes.text();
    console.log(`[FreeWave] YouTube HTML: ${html.length} bytes`);

    const parsed = parseYtInitialData(html, limit);
    console.log(`[FreeWave] Parsed ${parsed.length} videos from ytInitialData`);

    if (parsed.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = parsed
      .filter((v) => {
        const dur = parseDuration(v.duration);
        // Keep music-length tracks: 1min to 10min
        if (dur !== null && (dur < 60 || dur > 600)) return false;
        return true;
      })
      .map((v) => ({
        id: `yt-${v.videoId}`,
        title: cleanTitle(v.title),
        artist: cleanArtist(v.artist),
        artwork: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        source: "youtube" as const,
        videoId: v.videoId,
        duration: parseDuration(v.duration),
        previewUrl: null as null,
      }));

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("[FreeWave] YouTube search error:", error);
    return NextResponse.json({ tracks: [] });
  }
}

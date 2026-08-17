import { NextResponse } from "next/server";

// Quick lookup: find a single YouTube videoId for a given song title + artist
// Uses ytInitialData parsing from YouTube search HTML

interface ParsedVideo {
  videoId: string;
  title: string;
  artist: string;
  duration: string;
}

function parseFirstVideo(html: string): ParsedVideo | null {
  try {
    const match = html.match(/var ytInitialData = ({.+?});\s*<\/script>/s);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents || [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.adSlotRenderer) continue;
        const vr = item.videoRenderer;
        if (!vr?.videoId) continue;

        const titleRuns = vr.title?.runs || [];
        const channelRuns = vr.longBylineText?.runs || [];

        return {
          videoId: vr.videoId,
          title: titleRuns[0]?.text || "",
          artist: channelRuns[0]?.text || "",
          duration: vr.lengthText?.simpleText || "",
        };
      }
    }
  } catch {
    // parse error
  }
  return null;
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
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ videoId: null, duration: null });
  }

  const query = `${artist} ${title} official audio`;

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ videoId: null, duration: null });
    }

    const html = await res.text();
    const video = parseFirstVideo(html);

    if (video) {
      return NextResponse.json({
        videoId: video.videoId,
        duration: parseDuration(video.duration),
      });
    }
  } catch (error) {
    console.error("[FreeWave] YouTube lookup error:", error);
  }

  return NextResponse.json({ videoId: null, duration: null });
}

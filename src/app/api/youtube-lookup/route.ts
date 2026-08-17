import { NextResponse } from "next/server";

// Quick lookup: find a single YouTube videoId for a given song title + artist
// Used to upgrade iTunes tracks to full-track playback on-demand

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
  lengthSeconds: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ videoId: null, duration: null });
  }

  const query = `${artist} ${title} official audio`;

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&page=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "FreeWave/1.0",
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const videos: InvidiousVideo[] = (data || [])
        .filter((item: Record<string, unknown>) => item.type === "video" && item.videoId);

      if (videos.length > 0) {
        // Return the first (most relevant) result
        return NextResponse.json({
          videoId: videos[0].videoId,
          duration: videos[0].lengthSeconds > 0 ? videos[0].lengthSeconds : null,
        });
      }
    } catch {
      // Try next instance
    }
  }

  return NextResponse.json({ videoId: null, duration: null });
}

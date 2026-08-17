import { NextResponse } from "next/server";

// Quick lookup: find a single YouTube videoId using innertube API

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  if (!title || !artist) {
    return NextResponse.json({ videoId: null, duration: null });
  }

  const query = `${artist} ${title} official audio`;

  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250101.00.00",
          },
        },
        query: query,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ videoId: null, duration: null });
    }

    const data = await res.json();

    // Find first videoId recursively
    function findFirstVideoId(obj: unknown): { videoId: string; duration: number | null } | null {
      if (!obj || typeof obj !== "object") return null;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const result = findFirstVideoId(item);
          if (result) return result;
        }
        return null;
      }
      const record = obj as Record<string, unknown>;
      if (
        typeof record.videoId === "string" &&
        record.videoId.length === 11
      ) {
        // Try to get duration
        let duration: number | null = null;
        if (record.lengthText && typeof record.lengthText === "object") {
          const lt = record.lengthText as Record<string, unknown>;
          if (typeof lt.simpleText === "string") {
            const parts = lt.simpleText.split(":").map(Number);
            if (parts.length === 2 && parts.every((n) => !isNaN(n))) {
              duration = parts[0] * 60 + parts[1];
            } else if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
              duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }
        }
        return { videoId: record.videoId, duration };
      }
      for (const value of Object.values(record)) {
        const result = findFirstVideoId(value);
        if (result) return result;
      }
      return null;
    }

    const result = findFirstVideoId(data);
    if (result) {
      return NextResponse.json(result);
    }
  } catch (e) {
    console.error("[FreeWave] YouTube lookup failed:", e);
  }

  return NextResponse.json({ videoId: null, duration: null });
}

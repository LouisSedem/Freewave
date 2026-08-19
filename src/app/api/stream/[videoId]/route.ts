import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for ytdl-core compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AudioFormat {
  url: string;
  mimeType: string;
  bitrate: number;
  contentLength?: number;
}

/**
 * GET /api/stream/[videoId]
 * Server-side YouTube audio URL extraction.
 * Returns a direct audio URL the browser's <audio> element can play.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  try {
    const ytdl = await import("@distube/ytdl-core");
    const info = await ytdl.default.getInfo(videoId, {
      requestOptions: {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        },
      },
    });

    // Filter to audio-only formats, prefer m4a/mp4 for widest browser support
    const audioFormats = (info.formats || [])
      .filter((f: AudioFormat) => {
        if (!f.url || f.bitrate < 64000) return false;
        return (
          f.mimeType?.startsWith("audio/") &&
          !f.mimeType?.includes("video")
        );
      })
      .sort((a: AudioFormat, b: AudioFormat) => b.bitrate - a.bitrate);

    if (audioFormats.length === 0) {
      return NextResponse.json(
        { error: "No audio formats found" },
        { status: 404 }
      );
    }

    const best = audioFormats[0];
    const duration = info.videoDetails?.lengthSeconds
      ? parseInt(info.videoDetails.lengthSeconds, 10)
      : null;

    return NextResponse.json({
      url: best.url,
      mimeType: best.mimeType,
      bitrate: best.bitrate,
      duration,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[FreeWave] Audio extraction failed for ${videoId}:`, message);
    return NextResponse.json(
      { error: "Failed to extract audio", details: message },
      { status: 500 }
    );
  }
}

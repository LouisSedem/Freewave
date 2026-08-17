export const runtime = 'edge';

import { NextResponse } from "next/server";

// YouTube Innertube API — the same API YouTube's own website uses internally.
// No API key needed, no scraping, no third-party dependencies.

interface InnertubeVideoRenderer {
  videoId: string;
  title?: { runs?: Array<{ text: string }> };
  lengthText?: { simpleText: string };
  ownerText?: { runs?: Array<{ text: string }> };
  thumbnail?: { thumbnails: Array<{ url: string; width: number; height: number }> };
}

// Parse "3:45" or "1:02:30" → seconds
function parseDuration(text: string): number | null {
  if (!text) return null;
  const parts = text.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

// Extract title text from YouTube's runs format
function getTitle(renderer: InnertubeVideoRenderer): string {
  const runs = renderer.title?.runs;
  if (!runs || runs.length === 0) return "YouTube Video";
  return runs[0].text;
}

// Extract artist/author from ownerText
function getArtist(renderer: InnertubeVideoRenderer): string {
  const runs = renderer.ownerText?.runs;
  if (!runs || runs.length === 0) return "Unknown";
  return runs[0].text.replace(/ - Topic$/, "").replace(/VEVO$/, "VEVO");
}

// Extract best thumbnail
function getThumbnail(renderer: InnertubeVideoRenderer, videoId: string): string {
  const thumbs = renderer.thumbnail?.thumbnails;
  if (thumbs && thumbs.length > 0) {
    // Prefer medium quality
    const medium = thumbs.find((t) => t.width >= 320 && t.width < 480);
    return (medium || thumbs[thumbs.length - 1]).url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// Recursively extract all videoRenderers from innertube response
function extractVideoRenderers(obj: unknown): InnertubeVideoRenderer[] {
  const results: InnertubeVideoRenderer[] = [];
  const seen = new Set<string>();

  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const record = node as Record<string, unknown>;
    if (record.videoId && typeof record.videoId === "string" && record.videoId.length === 11) {
      if (!seen.has(record.videoId)) {
        seen.add(record.videoId);
        results.push(record as unknown as InnertubeVideoRenderer);
      }
    }
    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  walk(obj);
  return results;
}

// Clean up YouTube title
function cleanTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "")
    .replace(/".*?"/g, "")
    .replace(/\(.*?(official|audio|lyric|video|hd|4k|mv|clip|performance|live).*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Search YouTube via innertube API
async function searchViaInntertube(query: string, limit: number): Promise<Track[]> {
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
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const renderers = extractVideoRenderers(data);

    return renderers.slice(0, limit).map((r) => ({
      id: `yt-${r.videoId}`,
      title: cleanTitle(getTitle(r)),
      artist: getArtist(r),
      artwork: getThumbnail(r, r.videoId),
      source: "youtube" as const,
      videoId: r.videoId,
      duration: parseDuration(r.lengthText?.simpleText || ""),
      previewUrl: null,
    }));
  } catch (e) {
    console.error("[FreeWave] Innertube search failed:", e);
    return [];
  }
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
    const tracks = await searchViaInntertube(query + " music audio", limit);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("YouTube search failed:", error);
    return NextResponse.json({ tracks: [] });
  }
}

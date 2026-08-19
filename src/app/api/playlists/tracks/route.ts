import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/playlists/tracks?playlistId=xxx - Get tracks in a playlist
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    if (!playlistId) {
      return NextResponse.json({ error: "playlistId is required" }, { status: 400 });
    }

    const tracks = await db.playlistTrack.findMany({
      where: { playlistId },
      orderBy: { addedAt: "asc" },
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Failed to fetch playlist tracks:", error);
    return NextResponse.json({ tracks: [] }, { status: 500 });
  }
}

// POST /api/playlists/tracks - Add a track to a playlist
export async function POST(request: Request) {
  try {
    const { playlistId, trackId, title, artist, artwork, source, videoId, duration } = await request.json();

    if (!playlistId || !trackId || !title || !artist) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const track = await db.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        title,
        artist,
        artwork: artwork || null,
        source: source || "itunes",
        videoId: videoId || null,
        duration: duration || null,
      },
    });

    // Update playlist timestamp
    await db.playlist.update({
      where: { id: playlistId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ track });
  } catch (error: unknown) {
    // Handle unique constraint (track already in playlist)
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Track already in playlist" }, { status: 409 });
    }
    console.error("Failed to add track to playlist:", error);
    return NextResponse.json({ error: "Failed to add track" }, { status: 500 });
  }
}

// DELETE /api/playlists/tracks - Remove a track from a playlist
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const track = await db.playlistTrack.findUnique({ where: { id } });
    if (track) {
      await db.playlist.update({
        where: { id: track.playlistId },
        data: { updatedAt: new Date() },
      });
    }

    await db.playlistTrack.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove track from playlist:", error);
    return NextResponse.json({ error: "Failed to remove track" }, { status: 500 });
  }
}

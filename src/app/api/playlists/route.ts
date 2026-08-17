import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/playlists - List all playlists
export async function GET() {
  try {
    const playlists = await db.playlist.findMany({
      include: {
        _count: { select: { tracks: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Failed to fetch playlists:", error);
    return NextResponse.json({ playlists: [] }, { status: 500 });
  }
}

// POST /api/playlists - Create a new playlist
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const playlist = await db.playlist.create({
      data: { name: name.trim() },
    });

    return NextResponse.json({ playlist });
  } catch (error) {
    console.error("Failed to create playlist:", error);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}

// DELETE /api/playlists - Delete a playlist
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.playlist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete playlist:", error);
    return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}

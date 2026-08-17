import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/favorites - Get all favorites
export async function GET() {
  try {
    const favorites = await db.favorite.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Failed to fetch favorites:", error);
    return NextResponse.json({ favorites: [] }, { status: 500 });
  }
}

// POST /api/favorites - Add a track to favorites
export async function POST(request: Request) {
  try {
    const { trackId, title, artist, artwork, source, videoId, duration } = await request.json();

    if (!trackId || !title) {
      return NextResponse.json({ error: "trackId and title are required" }, { status: 400 });
    }

    const favorite = await db.favorite.upsert({
      where: { trackId },
      update: {},
      create: { trackId, title, artist: artist || "", artwork, source, videoId, duration },
    });

    return NextResponse.json({ favorite });
  } catch (error) {
    console.error("Failed to add favorite:", error);
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove a favorite
export async function DELETE(request: Request) {
  try {
    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json({ error: "trackId is required" }, { status: 400 });
    }

    await db.favorite.delete({ where: { trackId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove favorite:", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { searchITunes } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "12");

  if (!query.trim()) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const itunesResults = await searchITunes(query, limit);
    return NextResponse.json({ tracks: itunesResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ tracks: [] }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { findHarmonicMatches } from "@/lib/harmonicService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const bpm = searchParams.has("bpm") ? parseFloat(searchParams.get("bpm")!) : 128;
    const key = searchParams.has("key") ? parseInt(searchParams.get("key")!, 10) : 0;
    const mode = searchParams.has("mode") ? parseInt(searchParams.get("mode")!, 10) : 1;
    const tolerance = parseFloat(searchParams.get("tolerance") || "2");
    const includeHalftime = searchParams.get("halftime") !== "false";
    const includeDoubletime = searchParams.get("doubletime") !== "false";
    const includeRelative = searchParams.get("relative") !== "false";
    const artist = searchParams.get("artist") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

    const result = await findHarmonicMatches({
      targetBpm: bpm,
      targetKey: key,
      targetMode: mode,
      tolerance,
      includeHalftime,
      includeDoubletime,
      includeRelative,
      artist,
      genre,
      page,
      limit,
    });

    return NextResponse.json({
      target: {
        bpm: Math.round(bpm),
        key,
        mode,
        tolerance,
        artist,
        genre,
      },
      ...result,
    });
  } catch (error: any) {
    console.error("API /api/compatible error:", error);
    return NextResponse.json(
      { error: "Harmonic search failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

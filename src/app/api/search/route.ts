import { NextRequest, NextResponse } from "next/server";
import { parseSearchPrompt } from "@/lib/promptParser";
import { getPopularTracks, findHarmonicMatches } from "@/lib/harmonicService";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

    const tolerance = parseInt(searchParams.get("tolerance") || "2", 10);
    const includeHalftime = searchParams.get("halftime") !== "false";
    const includeDoubletime = searchParams.get("doubletime") !== "false";
    const includeRelative = searchParams.get("relative") !== "false";

    // 1. Empty query -> return popular catalog
    if (!q && !searchParams.get("bpm") && !searchParams.get("key") && !searchParams.get("artist") && !searchParams.get("genre")) {
      const result = await getPopularTracks(page, limit);
      return NextResponse.json({
        mode: "popular",
        ...result,
      });
    }

    // 2. Parse natural prompt (e.g., "taylor 91 C", "pop 91 C", "100bpm Cmaj", "coldplay", "140")
    const parsed = parseSearchPrompt(q);

    // Explicit override parameters take precedence if provided
    const targetBpm = searchParams.has("bpm") ? parseInt(searchParams.get("bpm")!, 10) : parsed.bpm;
    const targetKey = searchParams.has("key") ? parseInt(searchParams.get("key")!, 10) : parsed.key;
    const targetMode = searchParams.has("mode") ? parseInt(searchParams.get("mode")!, 10) : parsed.mode;
    const artist = searchParams.get("artist") || parsed.artist;
    const genre = searchParams.get("genre") || parsed.genre;

    const result = await findHarmonicMatches({
      targetBpm,
      targetKey,
      targetMode,
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
      mode: parsed.hasFilters ? "filter" : "popular",
      parsed: {
        raw: q,
        bpm: targetBpm,
        key: targetKey,
        mode: targetMode,
        pitchName: parsed.pitchName,
        modeName: parsed.modeName,
        camelot: parsed.camelot,
        artist,
        genre,
      },
      ...result,
    });
  } catch (error: any) {
    console.error("API /api/search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

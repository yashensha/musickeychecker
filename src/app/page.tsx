"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { ParametersDrawer } from "@/components/ParametersDrawer";
import { SongFeed } from "@/components/SongFeed";
import { parseSearchPrompt } from "@/lib/promptParser";
import { getKeyDisplay } from "@/lib/musicalKeys";
import { SongRecord } from "@/lib/db";

const PAGE_SIZE = 25;

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [bpm, setBpm] = useState(128);
  const [tolerance, setTolerance] = useState(2);
  const [keyVal, setKeyVal] = useState(0); // 0 = C
  const [mode, setMode] = useState(1); // 1 = Major, 0 = Minor
  const [includeRelative, setIncludeRelative] = useState(true);
  const [includeHalftime, setIncludeHalftime] = useState(true);
  const [includeDoubletime, setIncludeDoubletime] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [tracks, setTracks] = useState<SongRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [matchCountText, setMatchCountText] = useState("(Showing popular catalog)");
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived Key summary
  const keyInfo = getKeyDisplay(keyVal, mode);
  const summaryPill = `${bpm} · ${keyInfo.shortName}`;

  // Parsed Prompt tags for SearchBar display
  const parsedPrompt = parseSearchPrompt(searchQuery);

  // Fetch function with pagination and unified composite query support
  const fetchResults = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const q = searchQuery.trim();

      // Case 1: Empty search bar -> fetch popular catalog
      if (!q) {
        const res = await fetch(`/api/search?page=${targetPage}&limit=${PAGE_SIZE}`);
        const data = await res.json();
        setTracks(data.tracks || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        setMatchCountText(`(${data.total?.toLocaleString() || 0} top popular tracks)`);
        setDurationMs(null);
        return;
      }

      // Case 2: Unified query with composite parsing (artist + genre + bpm + key)
      if (parsedPrompt.bpm !== undefined) setBpm(parsedPrompt.bpm);
      if (parsedPrompt.key !== undefined) setKeyVal(parsedPrompt.key);
      if (parsedPrompt.mode !== undefined) setMode(parsedPrompt.mode);

      const params = new URLSearchParams({
        q,
        tolerance: String(tolerance),
        relative: String(includeRelative),
        halftime: String(includeHalftime),
        doubletime: String(includeDoubletime),
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setTracks(data.tracks || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setDurationMs(data.durationMs || null);

      const timeText = data.durationMs ? ` in ${data.durationMs}ms` : "";
      setMatchCountText(`(${data.total?.toLocaleString() || 0} tracks found${timeText})`);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    tolerance,
    includeRelative,
    includeHalftime,
    includeDoubletime,
    parsedPrompt.bpm,
    parsedPrompt.key,
    parsedPrompt.mode,
  ]);

  // Debounced search trigger (resets to page 1)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(1);
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, tolerance, includeRelative, includeHalftime, includeDoubletime]);

  // Explicit page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchResults(newPage);
    // Smooth scroll back to feed top
    const container = document.getElementById("songListContainer");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle setting anchor song
  const handleSelectAnchor = (song: SongRecord) => {
    const sBpm = Math.round(song.bpm || song.raw_tempo);
    const kInfo = getKeyDisplay(song.key, song.mode);
    setBpm(sBpm);
    setKeyVal(song.key);
    setMode(song.mode);
    setPage(1);

    const promptStr = `${sBpm}bpm ${kInfo.pitchName}${kInfo.modeName.slice(0, 3)}`;
    setSearchQuery(promptStr);
  };

  const handleApplyPreset = (preset: string) => {
    setPage(1);
    setSearchQuery(preset);
  };

  // Dynamic feed title based on parsed parameters
  const getFeedTitle = () => {
    if (!searchQuery.trim()) return "Popular Songs";

    const parts: string[] = [];
    if (parsedPrompt.artist) parts.push(`Artist: "${parsedPrompt.artist}"`);
    if (parsedPrompt.genre) parts.push(`Genre: ${parsedPrompt.genre}`);
    if (parsedPrompt.bpm) parts.push(`${parsedPrompt.bpm} BPM`);
    if (parsedPrompt.pitchName) parts.push(`${parsedPrompt.pitchName} ${parsedPrompt.modeName || "Major"}`);

    if (parts.length > 0) {
      return parts.join(" · ");
    }
    return `Results for "${searchQuery}"`;
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8 flex-1">
        {/* Header */}
        <Header
          onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
          summaryPill={summaryPill}
          isDrawerOpen={isDrawerOpen}
        />

        {/* Hero Title */}
        <div className="space-y-2 text-center max-w-xl mx-auto pt-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
            Find songs in key.
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Search any artist, genre, tempo, or prompt like{" "}
            <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
              taylor 91 C
            </span>{" "}
            or{" "}
            <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
              pop 91 C
            </span>{" "}
            to filter the 2.17M catalog.
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onApplyPreset={handleApplyPreset}
          parsedBpm={parsedPrompt.bpm}
          parsedKeyText={
            parsedPrompt.pitchName && parsedPrompt.modeName
              ? `${parsedPrompt.pitchName} ${parsedPrompt.modeName}`
              : undefined
          }
          parsedArtist={parsedPrompt.artist}
          parsedGenre={parsedPrompt.genre}
          isLoading={isLoading}
        />

        {/* Progressive Disclosure Parameters Drawer */}
        {isDrawerOpen && (
          <ParametersDrawer
            bpm={bpm}
            onBpmChange={(newBpm) => {
              setBpm(newBpm);
              if (parsedPrompt.isHarmonicPrompt) {
                setSearchQuery(`${newBpm}bpm ${keyInfo.shortName}`);
              }
            }}
            tolerance={tolerance}
            onToleranceChange={setTolerance}
            keyVal={keyVal}
            onKeyChange={(k) => {
              setKeyVal(k);
              const nextKey = getKeyDisplay(k, mode);
              if (parsedPrompt.isHarmonicPrompt) {
                setSearchQuery(`${bpm}bpm ${nextKey.shortName}`);
              }
            }}
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              const nextKey = getKeyDisplay(keyVal, m);
              if (parsedPrompt.isHarmonicPrompt) {
                setSearchQuery(`${bpm}bpm ${nextKey.shortName}`);
              }
            }}
            includeRelative={includeRelative}
            onIncludeRelativeChange={setIncludeRelative}
            includeHalftime={includeHalftime}
            onIncludeHalftimeChange={setIncludeHalftime}
            includeDoubletime={includeDoubletime}
            onIncludeDoubletimeChange={setIncludeDoubletime}
            onClose={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Song Feed with Pagination */}
        <SongFeed
          tracks={tracks}
          isLoading={isLoading}
          isHarmonicMode={Boolean(parsedPrompt.bpm !== undefined || parsedPrompt.key !== undefined)}
          onSelectAnchor={handleSelectAnchor}
          feedTitle={getFeedTitle()}
          feedSubtitle={matchCountText}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          page={page}
          totalPages={totalPages}
          total={totalCount}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Minimal Footer */}
      <footer className="w-full max-w-4xl mx-auto px-4 py-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>HarmonicTrack · Clean DJ & Producer Crate Finder</div>
        <div>Indexed locally on PostgreSQL ({durationMs !== null ? `${durationMs}ms` : "Live"})</div>
      </footer>
    </main>
  );
}

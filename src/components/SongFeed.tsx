"use client";

import React from "react";
import { SongRecord } from "@/lib/db";
import { getKeyDisplay, formatDuration } from "@/lib/musicalKeys";

interface SongFeedProps {
  tracks: SongRecord[];
  isLoading: boolean;
  isHarmonicMode: boolean;
  onSelectAnchor: (song: SongRecord) => void;
  feedTitle: string;
  feedSubtitle: string;
  onOpenDrawer: () => void;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
}

export function SongFeed({
  tracks,
  isLoading,
  isHarmonicMode,
  onSelectAnchor,
  feedTitle,
  feedSubtitle,
  onOpenDrawer,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: SongFeedProps) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Active State Ribbon */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            {feedTitle}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {isLoading ? "(Loading...)" : feedSubtitle}
          </span>
        </div>
      </div>

      {/* Locked min-height (520px) container for CLS = 0 */}
      <div
        className="divide-y divide-slate-100 border-t border-b border-slate-100 min-h-[520px] relative"
        id="songListContainer"
      >
        {isLoading && tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[480px] text-center text-slate-400 space-y-3 px-4">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xs font-mono text-slate-400">Querying catalog...</div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[480px] text-center text-slate-400 space-y-3 px-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 text-sm">
              ♩
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-800">
                No compatible tracks in this exact range
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Try broadening tolerance to ±3 BPM, or toggle "Include Relative Key" in{" "}
                <button
                  onClick={onOpenDrawer}
                  className="underline font-medium text-slate-700 hover:text-slate-950"
                >
                  Parameters
                </button>
                .
              </p>
            </div>
          </div>
        ) : (
          tracks.map((s) => {
            const keyInfo = getKeyDisplay(s.key, s.mode);
            const intBpm = Math.round(s.bpm || s.raw_tempo);

            return (
              <div
                key={s.track_id}
                className="py-3.5 px-2 hover:bg-slate-50/80 rounded-lg transition duration-150 flex items-center justify-between gap-4 group"
              >
                {/* Left Info */}
                <div className="min-w-0 flex items-center gap-3">
                  <button
                    onClick={() => onSelectAnchor(s)}
                    title={`Find tracks compatible with ${s.name}`}
                    className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center text-xs font-mono transition"
                  >
                    ▶
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {s.name}
                      </span>
                      {s.genre && (
                        <span className="text-[10px] font-mono text-slate-400 border border-slate-200/80 px-1 rounded">
                          {s.genre}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      <span className="font-medium text-slate-700">
                        {s.artist_display}
                      </span>{" "}
                      {s.album && (
                        <>
                          <span className="text-slate-300">·</span> {s.album}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Tags (Closest Integer BPM strictly enforced) */}
                <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
                  {/* Key Tag */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">
                    <span className="font-semibold text-slate-900">
                      {keyInfo.shortName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({keyInfo.camelot})
                    </span>
                  </div>

                  {/* Integer BPM Tag */}
                  <div className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 font-semibold text-slate-900">
                    {intBpm}{" "}
                    <span className="font-normal text-[10px] text-slate-400">
                      BPM
                    </span>
                  </div>

                  {isHarmonicMode && (
                    <>
                      <div
                        className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          s.is_relative
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {s.key_match || (s.is_relative ? "Relative" : "Exact Key")}
                      </div>

                      {s.tempo_match && s.tempo_match !== "Standard" && (
                        <div className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {s.tempo_match}
                        </div>
                      )}
                    </>
                  )}

                  {/* Duration */}
                  <span className="text-[11px] text-slate-400 w-9 text-right">
                    {formatDuration(s.duration_ms)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{startItem.toLocaleString()}</strong>–
            <strong className="text-slate-800">{endItem.toLocaleString()}</strong> of{" "}
            <strong className="text-slate-800">{total.toLocaleString()}</strong> tracks
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-700 hover:text-slate-950 bg-white transition shadow-sm font-sans"
            >
              ← Previous
            </button>
            <span className="text-slate-600 px-2">
              Page <strong className="text-slate-900">{page}</strong> of{" "}
              <strong className="text-slate-900">{totalPages}</strong>
            </span>
            <button
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none text-slate-700 hover:text-slate-950 bg-white transition shadow-sm font-sans"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

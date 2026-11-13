"use client";

import React from "react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onApplyPreset: (preset: string) => void;
  parsedBpm?: number;
  parsedKeyText?: string;
  parsedArtist?: string;
  parsedGenre?: string;
  isLoading?: boolean;
}

const PRESETS = [
  "taylor 91 C",
  "128bpm Cmaj",
  "pop 91 C",
  "140bpm F#min",
  "hip hop 90 Dmin",
  "Taylor Swift",
];

export function SearchBar({
  value,
  onChange,
  onApplyPreset,
  parsedBpm,
  parsedKeyText,
  parsedArtist,
  parsedGenre,
  isLoading,
}: SearchBarProps) {
  const hasActiveFilters = Boolean(parsedBpm !== undefined || parsedKeyText || parsedArtist || parsedGenre);

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-slate-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Try 'taylor 91 C', 'pop 91 C', or '128bpm Cmaj'..."
          className="w-full pl-11 pr-28 py-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 shadow-sm hover:border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition font-medium"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          {parsedBpm !== undefined && (
            <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-medium text-[10px]">
              {parsedBpm} BPM
            </span>
          )}
          {parsedKeyText && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium text-[10px]">
              {parsedKeyText}
            </span>
          )}
        </div>
      </div>

      {/* Active Filter Chips Ribbon (When multi-filter detected) */}
      {hasActiveFilters && (parsedArtist || parsedGenre) && (
        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Active Filters:</span>
          {parsedArtist && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
              <span className="text-slate-400 font-sans">Artist:</span> <strong>{parsedArtist}</strong>
            </span>
          )}
          {parsedGenre && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
              <span className="text-slate-400 font-sans">Genre:</span> <strong>{parsedGenre}</strong>
            </span>
          )}
          {parsedBpm !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px]">
              <strong>{parsedBpm} BPM</strong>
            </span>
          )}
          {parsedKeyText && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
              <strong>{parsedKeyText}</strong>
            </span>
          )}
        </div>
      )}

      {/* Quick Suggestion Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
        <span className="text-[11px]">Quick presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onApplyPreset(preset)}
            className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 transition font-mono text-[11px]"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}

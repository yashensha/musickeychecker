"use client";

import React from "react";
import { PITCH_NAMES, getRelativeKey } from "@/lib/musicalKeys";

interface ParametersDrawerProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  tolerance: number;
  onToleranceChange: (tol: number) => void;
  keyVal: number;
  onKeyChange: (k: number) => void;
  mode: number;
  onModeChange: (m: number) => void;
  includeRelative: boolean;
  onIncludeRelativeChange: (val: boolean) => void;
  includeHalftime: boolean;
  onIncludeHalftimeChange: (val: boolean) => void;
  includeDoubletime: boolean;
  onIncludeDoubletimeChange: (val: boolean) => void;
  onClose: () => void;
}

export function ParametersDrawer({
  bpm,
  onBpmChange,
  tolerance,
  onToleranceChange,
  keyVal,
  onKeyChange,
  mode,
  onModeChange,
  includeRelative,
  onIncludeRelativeChange,
  includeHalftime,
  onIncludeHalftimeChange,
  includeDoubletime,
  onIncludeDoubletimeChange,
  onClose,
}: ParametersDrawerProps) {
  const rel = getRelativeKey(keyVal, mode);
  const minBpm = Math.max(40, bpm - tolerance);
  const maxBpm = bpm + tolerance;

  return (
    <div className="max-w-2xl mx-auto p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-5 transition duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Harmonic & Tempo Tuning
        </span>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          Close
        </button>
      </div>

      {/* Row 1: Tempo & Tolerance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-700">Target Tempo</span>
            <span className="font-mono font-bold text-slate-900">{bpm} BPM</span>
          </div>
          <input
            type="range"
            min="60"
            max="180"
            step="1"
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>60</span>
            <span>
              {minBpm} — {maxBpm} BPM
            </span>
            <span>180</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-slate-700 block">BPM Tolerance</span>
          <div className="inline-flex rounded-lg p-1 bg-white border border-slate-200 w-full">
            {[1, 2, 3].map((t) => (
              <button
                key={t}
                onClick={() => onToleranceChange(t)}
                className={`flex-1 py-1 text-xs font-mono rounded transition ${
                  tolerance === t
                    ? "bg-slate-900 text-white font-medium shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ±{t} BPM
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Pitch Selector */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-slate-700">Musical Key</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onModeChange(1)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                mode === 1
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Major
            </button>
            <button
              onClick={() => onModeChange(0)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition ${
                mode === 0
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Minor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
          {PITCH_NAMES.map((pitch, idx) => {
            const isSelected = idx === keyVal;
            return (
              <button
                key={pitch}
                onClick={() => onKeyChange(idx)}
                className={`py-1.5 text-xs font-mono rounded font-medium transition ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                }`}
              >
                {pitch}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Transition Multipliers */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
          <input
            type="checkbox"
            checked={includeRelative}
            onChange={(e) => onIncludeRelativeChange(e.target.checked)}
            className="rounded border-slate-300 text-slate-900 focus:ring-0"
          />
          <span>
            Include Relative Key (
            <span className="font-mono text-slate-500">
              {rel.label} · {rel.camelot}
            </span>
            )
          </span>
        </label>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={includeHalftime}
              onChange={(e) => onIncludeHalftimeChange(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Half-Time (÷2)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={includeDoubletime}
              onChange={(e) => onIncludeDoubletimeChange(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Double-Time (×2)</span>
          </label>
        </div>
      </div>
    </div>
  );
}


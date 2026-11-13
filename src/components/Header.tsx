"use client";

import React from "react";

interface HeaderProps {
  onToggleDrawer: () => void;
  summaryPill: string;
  isDrawerOpen: boolean;
}

export function Header({ onToggleDrawer, summaryPill, isDrawerOpen }: HeaderProps) {
  return (
    <header className="flex items-center justify-between pb-6 border-b border-slate-100">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
          ♩
        </div>
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Harmonic<span className="text-slate-400 font-normal">Track</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDrawer}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
            isDrawerOpen
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 bg-white"
          }`}
        >
          <span className={isDrawerOpen ? "text-slate-300" : "text-slate-400"}>⚙</span>
          <span>Parameters</span>
          <span
            className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
              isDrawerOpen ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
            }`}
          >
            {summaryPill}
          </span>
        </button>
      </div>
    </header>
  );
}


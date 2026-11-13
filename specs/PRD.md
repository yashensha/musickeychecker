# Product Requirements Document (PRD) — HarmonicTrack

## 1. Vision & Core Value
HarmonicTrack is a zero-friction song discovery tool for DJs, producers, and music curators to find harmonically compatible songs matching an exact tempo (BPM) and musical key from a normalized 2.17M track catalog.

## 2. Core User Experience & "Time to Aha" (Sub-5s)
- **Zero-Friction Initial State**: Shows top-ranked popular tracks immediately with their Key and rounded integer BPM.
- **Smart Prompt Search Bar**: Accepts natural prompts (e.g. `100bpm Cmaj`, `128 A minor`) and song/artist names.
- **Closest Integer BPM**: All tempo values are displayed as rounded whole integers (e.g., 128 BPM, not 128.03).
- **Progressive Disclosure**: Advanced controls ($\pm 1–3$ BPM tolerance, Half-Time, Double-Time, Camelot Wheel / 12-pitch selector) tucked into an accessible **Parameters** drawer.

## 3. Harmonic & Tempo Matching Rules
1. **BPM Range**: Target $B$ with tolerance $\Delta \in \{1, 2, 3\}$ (default $\pm 2$):
   - Standard: $[B - \Delta, B + \Delta]$
   - Half-Time ($\div 2$): $[(B/2) - \Delta/2, (B/2) + \Delta/2]$
   - Double-Time ($\times 2$): $[2B - 2\Delta, 2B + 2\Delta]$
2. **Key Matching**:
   - Exact Key & Mode ($K, M$)
   - Relative Key ($K - 3 \pmod{12}$ for Major, $K + 3 \pmod{12}$ for Minor)
   - Camelot codes ($8B, 8A$, etc.) displayed as auxiliary visual helpers.

## 4. Technical Architecture
- **Database**: Local PostgreSQL (`musiclib`) with normalized `tracks`, `artists`, `genres`, `track_artists`, and `track_genres` tables.
- **Backend API**: Hono / Node.js/TS running fast parametric SQL queries against indexed columns (`tempo`, `key`, `mode`, `popularity`).
- **Frontend**: Next.js App Router, Tailwind CSS, Geist typography.
- **Layout Shift Constraint**: $\text{CLS} = 0$, locked minimum height ($520\text{px}$) for result feeds.


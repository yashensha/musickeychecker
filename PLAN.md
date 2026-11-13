# Execution Plan — HarmonicTrack

- [x] **Stage 0: Data Acquisition & Relational Schema**
  - [x] Download 2.17M catalog & convert to Parquet.
  - [x] Create normalized PostgreSQL tables (`tracks`, `artists`, `genres`, `track_artists`, `track_genres`).
  - [x] Validate harmonic queries ($3–8\text{ms}$).
  - [x] Prototype UI mockup with Geist typography, smart search, and integer BPM.

- [x] **Task 1: Project Scaffolding & DB Client** (COMPLETED)
  - [x] Initialize Next.js with TypeScript and Tailwind CSS.
  - [x] Set up PostgreSQL connection pool with connection pooling and typed helpers.
  - [x] Implement integer BPM query helper (`ROUND(tempo)::INT AS bpm_int`).
  - [x] Verify database connection from Node.js runtime.

- [x] **Task 2: Backend API & Prompt Parser** (COMPLETED)
  - [x] Create `/api/search` (text & prompt parser).
  - [x] Create `/api/compatible` (harmonic & tempo matcher with $\pm 1–3$ tolerance, half/double time, relative keys).

- [x] **Task 3: Frontend Implementation** (COMPLETED)
  - [x] Implement Geist-styled search bar with dynamic prompt tag detection.
  - [x] Implement progressive disclosure Parameters drawer.
  - [x] Implement song feed with locked $520\text{px}$ container and integer BPM badges.

- [x] **Task 4: End-to-End Verification** (COMPLETED)
  - [x] Test full queries across multiple genres, tempos, and keys.
  - [x] Verify zero layout shift ($\text{CLS} = 0$).
  - [x] Launch and verify Next.js local development server on port 3000.

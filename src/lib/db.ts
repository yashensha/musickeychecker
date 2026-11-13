import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432", 10),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "1234",
    database: process.env.PGDATABASE || "musiclib",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export interface SongRecord {
  track_id: string;
  name: string;
  artist_display: string;
  album: string | null;
  duration_ms: number;
  bpm: number; // Stored as integer rounded
  raw_tempo: number;
  key: number; // 0-11
  mode: number; // 0=Minor, 1=Major
  popularity: number;
  danceability?: number;
  energy?: number;
  valence?: number;
  acousticness?: number;
  genre?: string;
  key_match?: string;
  tempo_match?: string;
  is_relative?: boolean;
}

export async function query<T = any>(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return { rows: res.rows as T[], duration };
}


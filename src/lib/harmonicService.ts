import { query, SongRecord } from "./db";
import { getRelativeKey } from "./musicalKeys";

export interface HarmonicSearchParams {
  targetBpm?: number;
  targetKey?: number; // 0-11
  targetMode?: number; // 1 = Major, 0 = Minor
  tolerance?: number; // 1, 2, or 3 BPM
  includeHalftime?: boolean;
  includeDoubletime?: boolean;
  includeRelative?: boolean;
  artist?: string;
  genre?: string;
  textQuery?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  tracks: T[];
  total: number;
  page: number;
  totalPages: number;
  durationMs?: number;
}

export async function getPopularTracks(page: number = 1, limit: number = 25): Promise<PaginatedResult<SongRecord>> {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT 
      t.track_id,
      t.name,
      t.artist_display,
      t.album,
      t.duration_ms,
      ROUND(t.tempo)::INT AS bpm,
      t.tempo AS raw_tempo,
      t.key,
      t.mode,
      t.popularity,
      t.danceability,
      t.energy,
      t.valence,
      t.acousticness,
      COUNT(*) OVER()::INT AS full_count,
      COALESCE(
        (SELECT g.name FROM track_genres tg JOIN genres g ON tg.genre_id = g.id WHERE tg.track_id = t.track_id LIMIT 1),
        'pop'
      ) AS genre
    FROM tracks t
    WHERE t.popularity >= 60
    ORDER BY t.popularity DESC
    LIMIT $1 OFFSET $2;
  `;
  const { rows, duration } = await query<SongRecord & { full_count?: number }>(sql, [limit, offset]);
  const total = rows[0]?.full_count || 0;
  return {
    tracks: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    durationMs: duration,
  };
}

export async function searchTracksByText(searchTerm: string, page: number = 1, limit: number = 25): Promise<PaginatedResult<SongRecord>> {
  const offset = (page - 1) * limit;
  const term = `%${searchTerm.trim()}%`;
  const sql = `
    SELECT 
      t.track_id,
      t.name,
      t.artist_display,
      t.album,
      t.duration_ms,
      ROUND(t.tempo)::INT AS bpm,
      t.tempo AS raw_tempo,
      t.key,
      t.mode,
      t.popularity,
      t.danceability,
      t.energy,
      t.valence,
      t.acousticness,
      COUNT(*) OVER()::INT AS full_count,
      COALESCE(
        (SELECT g.name FROM track_genres tg JOIN genres g ON tg.genre_id = g.id WHERE tg.track_id = t.track_id LIMIT 1),
        'pop'
      ) AS genre
    FROM tracks t
    WHERE t.name ILIKE $1 
       OR t.artist_display ILIKE $1
    ORDER BY t.popularity DESC
    LIMIT $2 OFFSET $3;
  `;
  const { rows, duration } = await query<SongRecord & { full_count?: number }>(sql, [term, limit, offset]);
  const total = rows[0]?.full_count || 0;
  return {
    tracks: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    durationMs: duration,
  };
}

export async function findHarmonicMatches(params: HarmonicSearchParams): Promise<PaginatedResult<SongRecord>> {
  const {
    targetBpm,
    targetKey,
    targetMode,
    tolerance = 2,
    includeHalftime = true,
    includeDoubletime = true,
    includeRelative = true,
    artist,
    genre,
    textQuery,
    page = 1,
    limit = 25,
  } = params;

  const offset = (page - 1) * limit;
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  let keyMatchExpr = "NULL AS key_match,";
  let isRelativeExpr = "false AS is_relative,";
  let tempoMatchExpr = "NULL AS tempo_match,";

  // 1. Key clauses
  if (targetKey !== undefined && targetMode !== undefined) {
    queryParams.push(targetKey, targetMode);
    const kIdx = queryParams.length - 1;
    const mIdx = queryParams.length;

    const keyClauses = [`(t.key = $${kIdx} AND t.mode = $${mIdx})`];

    if (includeRelative) {
      const rel = getRelativeKey(targetKey, targetMode);
      queryParams.push(rel.key, rel.mode);
      const rkIdx = queryParams.length - 1;
      const rmIdx = queryParams.length;
      keyClauses.push(`(t.key = $${rkIdx} AND t.mode = $${rmIdx})`);
    }

    whereConditions.push(`(${keyClauses.join(" OR ")})`);

    keyMatchExpr = `
      CASE 
        WHEN (t.key = $${kIdx} AND t.mode = $${mIdx}) THEN 'Exact Key'
        ELSE 'Relative Key'
      END AS key_match,
    `;
    isRelativeExpr = `
      CASE 
        WHEN (t.key = $${kIdx} AND t.mode = $${mIdx}) THEN false
        ELSE true
      END AS is_relative,
    `;
  }

  // 2. BPM clauses
  if (targetBpm !== undefined) {
    const stdMin = targetBpm - tolerance;
    const stdMax = targetBpm + tolerance;
    const bpmConditions = [`(t.tempo BETWEEN ${stdMin.toFixed(2)} AND ${stdMax.toFixed(2)})`];

    if (includeHalftime) {
      const halfBpm = targetBpm / 2.0;
      const hTol = tolerance / 2.0;
      bpmConditions.push(`(t.tempo BETWEEN ${(halfBpm - hTol).toFixed(2)} AND ${(halfBpm + hTol).toFixed(2)})`);
    }

    if (includeDoubletime) {
      const dblBpm = targetBpm * 2.0;
      const dTol = tolerance * 2.0;
      bpmConditions.push(`(t.tempo BETWEEN ${(dblBpm - dTol).toFixed(2)} AND ${(dblBpm + dTol).toFixed(2)})`);
    }

    whereConditions.push(`(${bpmConditions.join(" OR ")})`);

    tempoMatchExpr = `
      CASE
        WHEN t.tempo BETWEEN ${stdMin.toFixed(2)} AND ${stdMax.toFixed(2)} THEN 'Standard'
        WHEN t.tempo BETWEEN ${(targetBpm / 2 - tolerance / 2).toFixed(2)} AND ${(targetBpm / 2 + tolerance / 2).toFixed(2)} THEN 'Half-Time'
        WHEN t.tempo BETWEEN ${(targetBpm * 2 - tolerance * 2).toFixed(2)} AND ${(targetBpm * 2 + tolerance * 2).toFixed(2)} THEN 'Double-Time'
        ELSE 'Standard'
      END AS tempo_match,
    `;
  }

  // 3. Artist or Title condition
  if (artist && artist.trim()) {
    queryParams.push(`%${artist.trim()}%`);
    const artIdx = queryParams.length;
    whereConditions.push(`(t.artist_display ILIKE $${artIdx} OR t.name ILIKE $${artIdx})`);
  } else if (textQuery && textQuery.trim()) {
    queryParams.push(`%${textQuery.trim()}%`);
    const txtIdx = queryParams.length;
    whereConditions.push(`(t.artist_display ILIKE $${txtIdx} OR t.name ILIKE $${txtIdx})`);
  }

  // 4. Genre condition
  if (genre && genre.trim()) {
    queryParams.push(`%${genre.trim()}%`);
    const genIdx = queryParams.length;
    whereConditions.push(`EXISTS (
      SELECT 1 FROM track_genres tg 
      JOIN genres g ON tg.genre_id = g.id 
      WHERE tg.track_id = t.track_id AND g.name ILIKE $${genIdx}
    )`);
  }

  // 5. Default fallback if no conditions
  if (whereConditions.length === 0) {
    whereConditions.push("t.popularity >= 60");
  }

  // 6. Pagination
  queryParams.push(limit);
  const limitIdx = queryParams.length;

  queryParams.push(offset);
  const offsetIdx = queryParams.length;

  const sql = `
    SELECT 
      t.track_id,
      t.name,
      t.artist_display,
      t.album,
      t.duration_ms,
      ROUND(t.tempo)::INT AS bpm,
      t.tempo AS raw_tempo,
      t.key,
      t.mode,
      t.popularity,
      t.danceability,
      t.energy,
      t.valence,
      t.acousticness,
      COUNT(*) OVER()::INT AS full_count,
      ${keyMatchExpr}
      ${tempoMatchExpr}
      ${isRelativeExpr}
      COALESCE(
        (SELECT g.name FROM track_genres tg JOIN genres g ON tg.genre_id = g.id WHERE tg.track_id = t.track_id LIMIT 1),
        'pop'
      ) AS genre
    FROM tracks t
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY t.popularity DESC, t.tempo ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx};
  `;

  const { rows, duration } = await query<SongRecord & { full_count?: number }>(sql, queryParams);
  const total = rows[0]?.full_count || 0;
  return {
    tracks: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    durationMs: duration,
  };
}

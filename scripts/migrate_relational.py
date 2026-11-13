import os
import sys
import time
import io
import re
import psycopg2
import pandas as pd
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
PARQUET_PATH = os.path.join(DATA_DIR, "tracks_all.parquet")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema_relational.sql")
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")

def load_env():
    env_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().split("#")[0].strip()
    return env_vars

def split_artists(raw_artist: str) -> list[str]:
    if not raw_artist or pd.isna(raw_artist):
        return ["Unknown Artist"]
    if ";" in raw_artist:
        parts = [a.strip() for a in raw_artist.split(";") if a.strip()]
    elif "," in raw_artist and not any(w in raw_artist for w in ["The", "Orchestra", "Band", "Ensemble"]):
        parts = [a.strip() for a in raw_artist.split(",") if a.strip()]
    else:
        parts = [raw_artist.strip()]
    return parts if parts else ["Unknown Artist"]

def split_genres(raw_genre: str) -> list[str]:
    if not raw_genre or pd.isna(raw_genre) or raw_genre == "unknown":
        return []
    parts = [g.strip().lower() for g in re.split(r"[,/]", raw_genre) if g.strip()]
    return parts

def migrate():
    config = load_env()
    print("Connecting to PostgreSQL 'musiclib'...")
    conn = psycopg2.connect(
        host=config.get("PGHOST", "localhost"),
        port=config.get("PGPORT", "5432"),
        user=config.get("PGUSER", "postgres"),
        password=config.get("PGPASSWORD", "1234"),
        dbname=config.get("PGDATABASE", "musiclib")
    )
    cur = conn.cursor()

    print("Dropping existing tables for clean schema re-build...")
    cur.execute("DROP TABLE IF EXISTS track_artists CASCADE;")
    cur.execute("DROP TABLE IF EXISTS track_genres CASCADE;")
    cur.execute("DROP TABLE IF EXISTS tracks CASCADE;")
    cur.execute("DROP TABLE IF EXISTS artists CASCADE;")
    cur.execute("DROP TABLE IF EXISTS genres CASCADE;")
    conn.commit()

    print("Applying relational schema from schema_relational.sql...")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        cur.execute(f.read())
    conn.commit()
    print("Relational schema created.")

    print(f"Reading {PARQUET_PATH} into memory...")
    t0 = time.time()
    df = pd.read_parquet(PARQUET_PATH)
    print(f"Loaded {len(df):,} records in {time.time() - t0:.2f}s.")

    # 1. Parse Artists and Genres
    print("Extracting relational entities...")
    unique_artists = set()
    unique_genres = set()
    
    parsed_artists_list = []
    parsed_genres_list = []

    for _, row in df[["artist", "genre"]].iterrows():
        arts = split_artists(row["artist"])
        gens = split_genres(row["genre"])
        parsed_artists_list.append(arts)
        parsed_genres_list.append(gens)
        unique_artists.update(arts)
        unique_genres.update(gens)

    print(f"Discovered {len(unique_artists):,} unique artists.")
    print(f"Discovered {len(unique_genres):,} unique genres.")

    # 2. Bulk Insert Artists
    print("Bulk inserting unique artists...")
    t_art = time.time()
    sorted_artists = sorted(list(unique_artists))
    art_buf = io.StringIO()
    for art in sorted_artists:
        clean_name = art.replace('"', '""')
        art_buf.write(f'"{clean_name}"\n')
    art_buf.seek(0)
    
    cur.copy_expert("COPY artists (name) FROM STDIN WITH (FORMAT CSV, QUOTE '\"');", art_buf)
    conn.commit()
    print(f"Inserted {len(sorted_artists):,} artists in {time.time() - t_art:.2f}s.")

    print("Fetching artist ID map from DB...")
    cur.execute("SELECT name, id FROM artists;")
    artist_map = dict(cur.fetchall())

    # 3. Bulk Insert Genres
    print("Bulk inserting unique genres...")
    sorted_genres = sorted(list(unique_genres))
    gen_buf = io.StringIO()
    for gen in sorted_genres:
        clean_gen = gen.replace('"', '""')
        gen_buf.write(f'"{clean_gen}"\n')
    gen_buf.seek(0)
    
    cur.copy_expert("COPY genres (name) FROM STDIN WITH (FORMAT CSV, QUOTE '\"');", gen_buf)
    conn.commit()

    cur.execute("SELECT name, id FROM genres;")
    genre_map = dict(cur.fetchall())
    print(f"Inserted {len(sorted_genres):,} genres.")

    # 4. Bulk Insert Tracks with artist_display
    print("Streaming master tracks into 'tracks' table...")
    t_tracks = time.time()
    
    df["artist_display"] = [", ".join(a) for a in parsed_artists_list]
    track_cols = [
        "track_id", "name", "artist_display", "album", "duration_ms",
        "tempo", "key", "mode", "popularity",
        "danceability", "energy", "valence", "acousticness", "loudness", "speechiness"
    ]

    chunk_size = 400000
    copy_track_sql = "COPY tracks (" + ", ".join(track_cols) + ") FROM STDIN WITH (FORMAT CSV, HEADER FALSE, QUOTE '\"', ESCAPE '\\');"

    for i in range(0, len(df), chunk_size):
        chunk = df.iloc[i:i + chunk_size][track_cols]
        buf = io.StringIO()
        chunk.to_csv(buf, index=False, header=False, sep=",", doublequote=True, escapechar="\\", na_rep="")
        buf.seek(0)
        cur.copy_expert(copy_track_sql, buf)
        conn.commit()
        print(f"\rStreamed {min(i + chunk_size, len(df)):,} / {len(df):,} tracks...", end="", flush=True)

    print(f"\nTracks inserted in {time.time() - t_tracks:.2f}s.")

    # 5. Build and Bulk Insert Track <-> Artist Junctions (Deduplicated per track)
    print("Generating track_artists junction relations (with per-track deduplication)...")
    t_ta = time.time()
    ta_buf = io.StringIO()
    track_ids = df["track_id"].tolist()
    
    for idx, t_id in enumerate(track_ids):
        arts = parsed_artists_list[idx]
        seen_artists_for_track = set()
        for pos, a_name in enumerate(arts, start=1):
            a_id = artist_map.get(a_name)
            if a_id and a_id not in seen_artists_for_track:
                seen_artists_for_track.add(a_id)
                ta_buf.write(f"{t_id},{a_id},{pos}\n")
    
    ta_buf.seek(0)
    print("Streaming into track_artists junction table...")
    cur.copy_expert("COPY track_artists (track_id, artist_id, position) FROM STDIN WITH (FORMAT CSV);", ta_buf)
    conn.commit()
    print(f"track_artists junction populated in {time.time() - t_ta:.2f}s.")

    # 6. Build and Bulk Insert Track <-> Genre Junctions (Deduplicated per track)
    print("Generating track_genres junction relations (with per-track deduplication)...")
    t_tg = time.time()
    tg_buf = io.StringIO()
    for idx, t_id in enumerate(track_ids):
        gens = parsed_genres_list[idx]
        seen_genres_for_track = set()
        for g_name in gens:
            g_id = genre_map.get(g_name)
            if g_id and g_id not in seen_genres_for_track:
                seen_genres_for_track.add(g_id)
                tg_buf.write(f"{t_id},{g_id}\n")
    
    tg_buf.seek(0)
    print("Streaming into track_genres junction table...")
    cur.copy_expert("COPY track_genres (track_id, genre_id) FROM STDIN WITH (FORMAT CSV);", tg_buf)
    conn.commit()
    print(f"track_genres junction populated in {time.time() - t_tg:.2f}s.")

    # Verification Counts
    cur.execute("SELECT count(*) FROM artists;")
    total_art = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM genres;")
    total_gen = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM tracks;")
    total_trk = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM track_artists;")
    total_ta = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM track_genres;")
    total_tg = cur.fetchone()[0]

    print("\n" + "=" * 60)
    print("RELATIONAL MIGRATION COMPLETE:")
    print(f" - artists:       {total_art:,} records")
    print(f" - genres:        {total_gen:,} records")
    print(f" - tracks:        {total_trk:,} records")
    print(f" - track_artists: {total_ta:,} junction links")
    print(f" - track_genres:  {total_tg:,} junction links")
    print("=" * 60)

    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate()

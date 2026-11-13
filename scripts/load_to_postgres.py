import os
import sys
import time
import io
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import pandas as pd
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
PARQUET_PATH = os.path.join(DATA_DIR, "tracks_all.parquet")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")
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

def ensure_database(config):
    conn = psycopg2.connect(
        host=config.get("PGHOST", "localhost"),
        port=config.get("PGPORT", "5432"),
        user=config.get("PGUSER", "postgres"),
        password=config.get("PGPASSWORD", "1234"),
        dbname="postgres"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    target_db = config.get("PGDATABASE", "musiclib")
    
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (target_db,))
    if not cur.fetchone():
        print(f"Creating database '{target_db}'...")
        cur.execute(f'CREATE DATABASE "{target_db}";')
        print(f"Database '{target_db}' created successfully.")
    else:
        print(f"Database '{target_db}' already exists.")
    cur.close()
    conn.close()

def get_target_connection(config):
    return psycopg2.connect(
        host=config.get("PGHOST", "localhost"),
        port=config.get("PGPORT", "5432"),
        user=config.get("PGUSER", "postgres"),
        password=config.get("PGPASSWORD", "1234"),
        dbname=config.get("PGDATABASE", "musiclib")
    )

def load_data():
    config = load_env()
    print("Checking PostgreSQL setup...")
    ensure_database(config)
    
    conn = get_target_connection(config)
    cur = conn.cursor()
    
    print(f"Applying schema from {SCHEMA_PATH}...")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    cur.execute(schema_sql)
    conn.commit()
    print("Schema applied successfully.")

    cur.execute("SELECT count(*) FROM tracks;")
    existing_count = cur.fetchone()[0]
    if existing_count > 0:
        print(f"Notice: 'tracks' table already contains {existing_count:,} records. Truncating for fresh reload...")
        cur.execute("TRUNCATE TABLE tracks;")
        conn.commit()

    print(f"Reading {PARQUET_PATH} into memory...")
    t0 = time.time()
    df = pd.read_parquet(PARQUET_PATH)
    print(f"Loaded {len(df):,} records into memory in {time.time() - t0:.2f}s.")

    cols = [
        "track_id", "name", "artist", "album", "genre", "duration_ms",
        "tempo", "key", "mode", "popularity",
        "danceability", "energy", "valence", "acousticness", "loudness", "speechiness"
    ]

    print("Streaming records into PostgreSQL via CSV COPY...")
    stream_start = time.time()
    
    chunk_size = 400000
    total_loaded = 0
    copy_sql = "COPY tracks (" + ", ".join(cols) + ") FROM STDIN WITH (FORMAT CSV, HEADER FALSE, QUOTE '\"', ESCAPE '\\');"
    
    for i in range(0, len(df), chunk_size):
        chunk = df.iloc[i:i + chunk_size][cols]
        buf = io.StringIO()
        # Output standard RFC-4180 CSV
        chunk.to_csv(buf, index=False, header=False, sep=",", doublequote=True, escapechar="\\", na_rep="")
        buf.seek(0)
        
        cur.copy_expert(copy_sql, buf)
        conn.commit()
        total_loaded += len(chunk)
        print(f"\rLoaded {total_loaded:,} / {len(df):,} tracks ({total_loaded/len(df)*100:.1f}%)...", end="", flush=True)

    elapsed = time.time() - stream_start
    print(f"\nCOPY stream complete in {elapsed:.2f}s!")

    cur.execute("SELECT count(*) FROM tracks;")
    final_count = cur.fetchone()[0]
    print(f"Verified row count in PostgreSQL: {final_count:,} tracks.")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    load_data()

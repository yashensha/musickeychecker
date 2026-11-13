import os
import sys
import time
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_CSV_PATH = os.path.join(DATA_DIR, "raw_spotify_songs.csv")
PARQUET_ALL_PATH = os.path.join(DATA_DIR, "tracks_all.parquet")
SAMPLE_JSON_PATH = os.path.join(DATA_DIR, "tracks_sample_all.json")

def process_all():
    print(f"Reading raw CSV: {RAW_CSV_PATH}...")
    start_time = time.time()
    
    cols_to_read = [
        "track_id", "name", "artist", "album", "duration_ms", "genre",
        "tempo", "key", "mode", "popularity",
        "danceability", "energy", "valence", "acousticness", "loudness", "speechiness"
    ]
    
    chunks = []
    total_processed = 0
    for chunk in pd.read_csv(RAW_CSV_PATH, usecols=cols_to_read, chunksize=150000, low_memory=False):
        total_processed += len(chunk)
        # Drop rows missing crucial identifiers
        chunk = chunk.dropna(subset=["track_id", "name", "artist", "tempo", "key", "mode"])
        chunks.append(chunk)
        print(f"\rRead and cleaned {total_processed:,} rows...", end="", flush=True)
        
    print("\nConcatenating chunks into master DataFrame...")
    df = pd.concat(chunks, ignore_index=True)
    del chunks
    
    print(f"Total raw tracks loaded: {len(df):,}")
    
    # Deduplicate strictly on track_id
    df = df.drop_duplicates(subset=["track_id"])
    print(f"Unique track_id count: {len(df):,}")
    
    # Fill remaining non-critical nulls if any
    df["popularity"] = df["popularity"].fillna(0).astype(int)
    df["key"] = df["key"].astype(int)
    df["mode"] = df["mode"].astype(int)
    df["duration_ms"] = df["duration_ms"].astype(int)
    df["tempo"] = df["tempo"].round(2)
    df["album"] = df["album"].fillna("Unknown Album")
    df["genre"] = df["genre"].fillna("unknown")
    
    # Sort by popularity descending
    df = df.sort_values(by="popularity", ascending=False).reset_index(drop=True)
    
    print(f"Final total count: {len(df):,} tracks.")
    print(f"Popularity span: {df['popularity'].min()} to {df['popularity'].max()}")
    print(f"Tempo (BPM) span: {df['tempo'].min()} to {df['tempo'].max()} BPM")
    
    print(f"Writing to Parquet: {PARQUET_ALL_PATH}...")
    df.to_parquet(PARQUET_ALL_PATH, index=False, engine="pyarrow", compression="snappy")
    
    size_mb = os.path.getsize(PARQUET_ALL_PATH) / (1024 * 1024)
    print(f"Saved {PARQUET_ALL_PATH} ({size_mb:.2f} MB) in {time.time() - start_time:.1f}s.")
    
    # Save 10 sample records
    sample_records = df.head(10).to_dict(orient="records")
    with open(SAMPLE_JSON_PATH, "w", encoding="utf-8") as f:
        import json
        json.dump(sample_records, f, indent=2)
    print(f"Sample saved to {SAMPLE_JSON_PATH}.")

if __name__ == "__main__":
    process_all()


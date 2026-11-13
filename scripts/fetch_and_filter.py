import os
import sys
import time
import urllib.request
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

RAW_CSV_PATH = os.path.join(DATA_DIR, "raw_spotify_songs.csv")
PARQUET_OUT_PATH = os.path.join(DATA_DIR, "tracks_top.parquet")
SAMPLE_JSON_PATH = os.path.join(DATA_DIR, "tracks_sample.json")

DATASET_URL = "https://huggingface.co/datasets/ConquestAce/spotify-songs/resolve/main/cleaned_merged_df.csv"

def download_file(url, target_path):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 300 * 1024 * 1024:
        print(f"File already downloaded ({os.path.getsize(target_path) / (1024*1024):.2f} MB): {target_path}")
        return
    print(f"Downloading from {url}...")
    start_time = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(target_path, "wb") as f:
        total_size = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024 * 4  # 4MB chunks
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                pct = (downloaded / total_size) * 100
                print(f"\rDownloaded {downloaded / (1024*1024):.1f}/{total_size / (1024*1024):.1f} MB ({pct:.1f}%)", end="", flush=True)
            else:
                print(f"\rDownloaded {downloaded / (1024*1024):.1f} MB", end="", flush=True)
    print(f"\nDownload completed in {time.time() - start_time:.1f}s.")

def process_and_filter():
    print("Reading and processing raw CSV chunks...")
    chunks = []
    # Read relevant columns only to be fast & memory efficient
    cols_to_read = [
        "track_id", "name", "artist", "album", "duration_ms", "genre",
        "tempo", "key", "mode", "popularity",
        "danceability", "energy", "valence", "acousticness", "loudness", "speechiness"
    ]
    
    total_processed = 0
    start_time = time.time()
    
    # Process in chunks of 100,000 rows
    for chunk in pd.read_csv(RAW_CSV_PATH, usecols=cols_to_read, chunksize=100000, low_memory=False):
        total_processed += len(chunk)
        # Drop rows with critical nulls
        chunk = chunk.dropna(subset=["track_id", "name", "artist", "tempo", "key", "mode", "popularity"])
        # Filter tracks with popularity > 0
        chunks.append(chunk)
        print(f"\rRead {total_processed:,} rows...", end="", flush=True)
    
    print("\nConcatenating records...")
    df = pd.concat(chunks, ignore_index=True)
    del chunks
    
    print(f"Total raw valid records: {len(df):,}")
    
    # Deduplicate by track_id
    df = df.drop_duplicates(subset=["track_id"])
    print(f"Records after track_id deduplication: {len(df):,}")
    
    # Deduplicate by (name, artist) - keep the highest popularity version
    df = df.sort_values(by="popularity", ascending=False).drop_duplicates(subset=["name", "artist"])
    print(f"Records after (name, artist) deduplication: {len(df):,}")
    
    # Slicing for top 250,000 - 500,000 tracks
    # Let's inspect popularity thresholds
    target_count = 350000
    if len(df) > target_count:
        cutoff_popularity = df["popularity"].nlargest(target_count).iloc[-1]
        print(f"Cutoff popularity for top ~{target_count:,} tracks: {cutoff_popularity}")
        df_filtered = df[df["popularity"] >= cutoff_popularity].copy()
        # If ties exceed 500,000, cap at 400,000
        if len(df_filtered) > 500000:
            df_filtered = df_filtered.head(400000)
    else:
        df_filtered = df.copy()

    # Clean types
    df_filtered["key"] = df_filtered["key"].astype(int)
    df_filtered["mode"] = df_filtered["mode"].astype(int)
    df_filtered["popularity"] = df_filtered["popularity"].astype(int)
    df_filtered["duration_ms"] = df_filtered["duration_ms"].astype(int)
    df_filtered["tempo"] = df_filtered["tempo"].round(2)
    
    print(f"\nFinal filtered dataset count: {len(df_filtered):,} tracks.")
    print("Popularity range:", df_filtered["popularity"].min(), "to", df_filtered["popularity"].max())
    
    # Save to Parquet
    print(f"Writing to Parquet: {PARQUET_OUT_PATH}...")
    df_filtered.to_parquet(PARQUET_OUT_PATH, index=False, engine="pyarrow")
    parquet_size_mb = os.path.getsize(PARQUET_OUT_PATH) / (1024 * 1024)
    print(f"Parquet file written successfully ({parquet_size_mb:.2f} MB).")
    
    # Save sample JSON (10 records)
    sample_records = df_filtered.head(10).to_dict(orient="records")
    with open(SAMPLE_JSON_PATH, "w", encoding="utf-8") as f:
        import json
        json.dump(sample_records, f, indent=2)
    print(f"Sample JSON written to {SAMPLE_JSON_PATH}.")

if __name__ == "__main__":
    download_file(DATASET_URL, RAW_CSV_PATH)
    process_and_filter()


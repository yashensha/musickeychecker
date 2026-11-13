-- Schema for Music Library (2M+ tracks)

CREATE TABLE IF NOT EXISTS tracks (
    track_id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    genre VARCHAR(64),
    duration_ms INT NOT NULL,
    tempo NUMERIC(6, 2) NOT NULL,       -- BPM (e.g. 128.00)
    key SMALLINT NOT NULL,              -- Pitch class 0-11 (0=C, 1=C#, ..., 11=B)
    mode SMALLINT NOT NULL,             -- 0 = Minor, 1 = Major
    popularity SMALLINT NOT NULL DEFAULT 0,
    danceability NUMERIC(4, 3),
    energy NUMERIC(4, 3),
    valence NUMERIC(4, 3),
    acousticness NUMERIC(6, 5),
    loudness NUMERIC(5, 2),
    speechiness NUMERIC(5, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries and filters
CREATE INDEX IF NOT EXISTS idx_tracks_tempo ON tracks (tempo);
CREATE INDEX IF NOT EXISTS idx_tracks_key_mode ON tracks (key, mode);
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks (genre);


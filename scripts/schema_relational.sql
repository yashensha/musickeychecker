-- Relational Music Library Schema

-- 1. Artists Table
CREATE TABLE IF NOT EXISTS artists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists (name);

-- 2. Genres Table
CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres (name);

-- 3. Master Tracks Table (Song-unique metrics)
CREATE TABLE IF NOT EXISTS tracks (
    track_id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    artist_display TEXT NOT NULL,       -- Human-readable joined artists (e.g. "Sam Smith, Kim Petras")
    album TEXT,
    duration_ms INT NOT NULL,
    tempo NUMERIC(6, 2) NOT NULL,       -- BPM (e.g. 128.00)
    key SMALLINT NOT NULL,              -- Pitch class 0-11
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

CREATE INDEX IF NOT EXISTS idx_tracks_tempo ON tracks (tempo);
CREATE INDEX IF NOT EXISTS idx_tracks_key_mode ON tracks (key, mode);
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks (popularity DESC);

-- 4. Track <-> Artist Many-to-Many Junction
CREATE TABLE IF NOT EXISTS track_artists (
    track_id VARCHAR(64) REFERENCES tracks(track_id) ON DELETE CASCADE,
    artist_id INT REFERENCES artists(id) ON DELETE CASCADE,
    position SMALLINT NOT NULL DEFAULT 1, -- 1 = Primary, 2+ = Featured/Collab
    PRIMARY KEY (track_id, artist_id)
);
CREATE INDEX IF NOT EXISTS idx_track_artists_artist_id ON track_artists (artist_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_track_id ON track_artists (track_id);

-- 5. Track <-> Genre Many-to-Many Junction
CREATE TABLE IF NOT EXISTS track_genres (
    track_id VARCHAR(64) REFERENCES tracks(track_id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (track_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_track_genres_genre_id ON track_genres (genre_id);
CREATE INDEX IF NOT EXISTS idx_track_genres_track_id ON track_genres (track_id);


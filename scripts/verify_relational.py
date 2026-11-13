import psycopg2

conn = psycopg2.connect(host="localhost", port=5432, user="postgres", password="1234", dbname="musiclib")
cur = conn.cursor()

print("=== 1. Multi-Artist Linking Test (Unholy) ===")
cur.execute("""
    SELECT t.name, a.id, a.name, ta.position 
    FROM tracks t
    JOIN track_artists ta ON t.track_id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    WHERE t.name ILIKE 'Unholy (feat. Kim Petras)%'
    ORDER BY ta.position ASC
    LIMIT 4;
""")
for r in cur.fetchall():
    print(f'Track: {r[0]} | Artist ID: {r[1]} -> "{r[2]}" (Position: {r[3]})')

print("\n=== 2. Artist Lookup via ID (Taylor Swift) ===")
cur.execute("""
    SELECT t.name, t.artist_display, t.tempo, t.key, t.mode, g.name
    FROM artists a
    JOIN track_artists ta ON a.id = ta.artist_id
    JOIN tracks t ON ta.track_id = t.track_id
    LEFT JOIN track_genres tg ON t.track_id = tg.track_id
    LEFT JOIN genres g ON tg.genre_id = g.id
    WHERE a.name = 'Taylor Swift'
    ORDER BY t.popularity DESC
    LIMIT 3;
""")
for r in cur.fetchall():
    print(f'Track: {r[0]} | Artists: {r[1]} | {r[2]} BPM | Key/Mode: {r[3]}/{r[4]} | Genre: {r[5]}')

print("\n=== 3. Relational Table Sizes ===")
cur.execute("""
    SELECT 
        relname, 
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE relkind = 'r' AND n.nspname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC;
""")
for r in cur.fetchall():
    print(f'Table: {r[0]:<15} | Size: {r[1]}')

conn.close()


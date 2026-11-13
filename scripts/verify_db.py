import psycopg2

conn = psycopg2.connect(host="localhost", port=5432, user="postgres", password="1234", dbname="musiclib")
cur = conn.cursor()

# 1. Total count
cur.execute("SELECT COUNT(*) FROM tracks;")
print("Total tracks in DB:", f"{cur.fetchone()[0]:,}")

# 2. Fast indexed query: Find house/dance tracks between 124-128 BPM in C# Major (key=1, mode=1)
cur.execute("""
    SELECT name, artist, tempo, key, mode, popularity, genre 
    FROM tracks 
    WHERE tempo BETWEEN 124 AND 128 
      AND key = 1 
      AND mode = 1 
    ORDER BY popularity DESC 
    LIMIT 5;
""")
print("\nTop 5 C# Major tracks (124-128 BPM):")
for row in cur.fetchall():
    print(f" - {row[0]} by {row[1]} | {row[2]} BPM | Pop: {row[5]} | Genre: {row[6]}")

# 3. Check table size on disk
cur.execute("SELECT pg_size_pretty(pg_total_relation_size('tracks'));")
print("\nPostgreSQL total table size (with indexes):", cur.fetchone()[0])

conn.close()


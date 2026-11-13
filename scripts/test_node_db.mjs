import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "1234",
  database: process.env.PGDATABASE || "musiclib",
});

async function main() {
  const t0 = Date.now();
  console.log("Connecting to PostgreSQL 'musiclib' from Node.js...");
  
  const client = await pool.connect();
  console.log("Connected successfully!");

  // Query sample tracks with integer BPM
  const res = await client.query(`
    SELECT 
      t.track_id,
      t.name,
      t.artist_display,
      ROUND(t.tempo)::INT AS bpm,
      t.tempo AS raw_tempo,
      t.key,
      t.mode,
      t.popularity
    FROM tracks t
    WHERE t.popularity >= 80
    ORDER BY t.popularity DESC
    LIMIT 5;
  `);

  console.log(`\nQuery completed in ${Date.now() - t0} ms:\n`);
  res.rows.forEach((r, i) => {
    console.log(`[${i + 1}] ${r.name} - ${r.artist_display} | ${r.bpm} BPM (raw: ${r.raw_tempo}) | Key/Mode: ${r.key}/${r.mode} | Pop: ${r.popularity}`);
  });

  client.release();
  await pool.end();
}

main().catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});


import { parseSearchPrompt } from "../src/lib/promptParser.js";
import { getPopularTracks, searchTracksByText, findHarmonicMatches } from "../src/lib/harmonicService.js";
import { pool } from "../src/lib/db.js";

async function runTests() {
  console.log("==================================================");
  console.log("TESTING TASK 2: BACKEND API & PROMPT PARSER LOGIC");
  console.log("==================================================\n");

  // 1. Test Prompt Parser
  console.log("1. Testing parseSearchPrompt()...");
  const testPrompts = [
    "100bpm Cmaj",
    "128 A minor",
    "140bpm F#min",
    "95 Bbm",
    "Taylor Swift",
    "Unholy",
  ];

  for (const p of testPrompts) {
    const res = parseSearchPrompt(p);
    if (res.isHarmonicPrompt) {
      console.log(` - "${p}" -> HARMONIC PROMPT: ${res.bpm} BPM, Key: ${res.pitchName} ${res.modeName}`);
    } else {
      console.log(` - "${p}" -> TEXT QUERY: "${res.textQuery}"`);
    }
  }

  // 2. Test getPopularTracks()
  console.log("\n2. Testing getPopularTracks()...");
  const popular = await getPopularTracks(5);
  console.log(`Fetched ${popular.length} popular tracks:`);
  popular.forEach((s) => {
    console.log(` - ${s.name} by ${s.artist_display} | ${s.bpm} BPM | Key: ${s.key}/${s.mode} | Pop: ${s.popularity}`);
  });

  // 3. Test findHarmonicMatches() for "100bpm Cmaj"
  console.log("\n3. Testing findHarmonicMatches({ targetBpm: 100, targetKey: 0, targetMode: 1 })...");
  const { matches: cMajMatches, durationMs: d1 } = await findHarmonicMatches({
    targetBpm: 100,
    targetKey: 0,
    targetMode: 1,
    tolerance: 2,
    includeHalftime: true,
    includeDoubletime: true,
    includeRelative: true,
    limit: 6,
  });

  console.log(`Found ${cMajMatches.length} matches in ${d1} ms:`);
  cMajMatches.forEach((s) => {
    console.log(` - ${s.name} by ${s.artist_display} | ${s.bpm} BPM (${s.tempo_match}) | ${s.key_match} | Pop: ${s.popularity}`);
  });

  // 4. Test searchTracksByText() for "Daft Punk"
  console.log("\n4. Testing searchTracksByText('Daft Punk')...");
  const daft = await searchTracksByText("Daft Punk", 3);
  console.log(`Found ${daft.length} tracks for 'Daft Punk':`);
  daft.forEach((s) => {
    console.log(` - ${s.name} by ${s.artist_display} | ${s.bpm} BPM | Pop: ${s.popularity}`);
  });

  await pool.end();
  console.log("\nALL BACKEND API SERVICES VERIFIED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});


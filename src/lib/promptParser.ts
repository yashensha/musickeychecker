import { PITCH_NAMES, getKeyDisplay } from "./musicalKeys";

export interface ParsedSearchQuery {
  raw: string;
  bpm?: number;
  key?: number; // 0-11
  mode?: number; // 1 = Major, 0 = Minor
  pitchName?: string;
  modeName?: "Major" | "Minor";
  camelot?: string;
  artist?: string;
  genre?: string;
  isHarmonicPrompt: boolean;
  hasFilters: boolean;
}

const FLAT_TO_SHARP_MAP: Record<string, string> = {
  BB: "A#",
  EB: "D#",
  AB: "G#",
  DB: "C#",
  GB: "F#",
};

export const KNOWN_GENRES = new Set([
  "acoustic", "afrobeat", "alt-rock", "alternative", "ambient", "anime", "black-metal",
  "bluegrass", "blues", "brazil", "breakbeat", "british", "cantopop", "chicago-house",
  "children", "chill", "classical", "club", "comedy", "country", "dance", "dancehall",
  "death-metal", "deep-house", "detroit-techno", "disco", "disney", "drum-and-bass",
  "dub", "dubstep", "edm", "electro", "electronic", "emo", "folk", "forro", "french",
  "funk", "garage", "german", "gospel", "goth", "grindcore", "groove", "grunge",
  "guitar", "happy", "hard-rock", "hardcore", "hardstyle", "heavy-metal", "hip-hop",
  "honky-tonk", "house", "idm", "indian", "indie", "indie-pop", "industrial", "iranian",
  "j-dance", "j-idol", "j-pop", "j-rock", "jazz", "k-pop", "kids", "latin", "latino",
  "malay", "mandopop", "metal", "metalcore", "minimal-techno", "mpb", "new-age",
  "opera", "pagode", "party", "piano", "pop", "pop-film", "power-pop", "progressive-house",
  "psych-rock", "punk", "punk-rock", "r-n-b", "rap", "reggae", "reggaeton", "rock",
  "rock-n-roll", "rockabilly", "romance", "sad", "salsa", "samba", "sertanejo",
  "show-tunes", "singer-songwriter", "ska", "sleep", "soul", "spanish", "study",
  "swedish", "synth-pop", "tango", "techno", "trance", "trip-hop", "turkish", "world-music"
]);

const GENRE_ALIASES: Record<string, string> = {
  "hip hop": "hip-hop",
  "hiphop": "hip-hop",
  "drum and bass": "drum-and-bass",
  "dnb": "drum-and-bass",
  "r&b": "r-n-b",
  "rnb": "r-n-b",
  "kpop": "k-pop",
  "jpop": "j-pop",
  "indie pop": "indie-pop",
  "alt rock": "alt-rock",
  "deep house": "deep-house",
  "synth pop": "synth-pop",
  "hard rock": "hard-rock",
  "punk rock": "punk-rock"
};

export function parseSearchPrompt(rawInput: string): ParsedSearchQuery {
  const raw = rawInput.trim();
  if (!raw) {
    return {
      raw: "",
      isHarmonicPrompt: false,
      hasFilters: false,
    };
  }

  let s = ` ${raw} `;
  let bpm: number | undefined;
  let key: number | undefined;
  let mode: number | undefined;
  let pitchName: string | undefined;
  let modeName: "Major" | "Minor" | undefined;
  let camelot: string | undefined;
  let genre: string | undefined;
  let artist: string | undefined;

  // 1. Detect BPM: "128bpm", "91 bpm", or standalone 2-3 digit number (40-240)
  const bpmMatch = s.match(/(?:^|\s)(\d{2,3}(?:\.\d+)?)\s*(?:bpm)?(?:\s|$)/i);
  if (bpmMatch && bpmMatch[1]) {
    const parsedVal = Math.round(parseFloat(bpmMatch[1]));
    if (parsedVal >= 40 && parsedVal <= 240) {
      bpm = parsedVal;
      // remove from string
      const idx = s.indexOf(bpmMatch[0]);
      s = s.slice(0, idx) + " " + s.slice(idx + bpmMatch[0].length);
    }
  }

  const hasBpm = bpm !== undefined;

  // 2. Detect Musical Key
  // Either explicit key with accidental or mode descriptor (Cmaj, Amin, F#, Bb, Cm, etc.)
  // Or standalone [A-G] when hasBpm is true (e.g. "taylor 91 C" or "128 A")
  let keyMatch = s.match(/(?:^|\s)([A-Ga-g][#b](?:\s*(?:maj(?:or)?|min(?:or)?|m))?|[A-Ga-g]\s*(?:maj(?:or)?|min(?:or)?|m))(?:\s|$)/i);
  
  if (!keyMatch && hasBpm) {
    keyMatch = s.match(/(?:^|\s)([A-Ga-g])(?:\s|$)/i);
  }

  if (keyMatch && keyMatch[1]) {
    const fullMatch = keyMatch[0];
    let noteToken = keyMatch[1].trim();

    // Parse note and optional descriptor
    const noteParts = noteToken.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (noteParts) {
      let baseNote = noteParts[1].toUpperCase();
      if (baseNote.length === 2 && baseNote[1] === "B") {
        baseNote = FLAT_TO_SHARP_MAP[baseNote] || baseNote;
      }
      const noteIdx = (PITCH_NAMES as readonly string[]).indexOf(baseNote);
      if (noteIdx !== -1) {
        key = noteIdx;
        pitchName = PITCH_NAMES[key];
        const descriptor = (noteParts[2] || "").toLowerCase().trim();
        if (descriptor.startsWith("min") || descriptor === "m") {
          mode = 0;
          modeName = "Minor";
        } else {
          mode = 1;
          modeName = "Major";
        }

        const kDisplay = getKeyDisplay(key, mode);
        camelot = kDisplay.camelot;

        // remove from string
        const idx = s.indexOf(fullMatch);
        s = s.slice(0, idx) + " " + s.slice(idx + fullMatch.length);
      }
    }
  }

  // 3. Detect Genre from remaining words
  const words = s.trim().split(/\s+/).filter(Boolean);
  const remainingWords: string[] = [];

  let i = 0;
  while (i < words.length) {
    const w = words[i].toLowerCase();
    // Check 2-word genre combo (e.g. "hip hop", "deep house")
    if (i + 1 < words.length) {
      const twoWords = `${w} ${words[i + 1].toLowerCase()}`;
      const hyphenWords = `${w}-${words[i + 1].toLowerCase()}`;
      if (GENRE_ALIASES[twoWords] || KNOWN_GENRES.has(twoWords) || KNOWN_GENRES.has(hyphenWords)) {
        genre = GENRE_ALIASES[twoWords] || (KNOWN_GENRES.has(hyphenWords) ? hyphenWords : twoWords);
        i += 2;
        continue;
      }
    }

    if (GENRE_ALIASES[w] || KNOWN_GENRES.has(w)) {
      genre = GENRE_ALIASES[w] || w;
      i += 1;
      continue;
    }

    remainingWords.push(words[i]);
    i += 1;
  }

  // 4. Remaining tokens represent Artist or Freeform Song title
  if (remainingWords.length > 0) {
    artist = remainingWords.join(" ").trim();
  }

  const isHarmonicPrompt = bpm !== undefined && key !== undefined && mode !== undefined;
  const hasFilters = Boolean(bpm !== undefined || key !== undefined || genre !== undefined || artist !== undefined);

  return {
    raw,
    bpm,
    key,
    mode,
    pitchName,
    modeName,
    camelot,
    genre,
    artist,
    isHarmonicPrompt,
    hasFilters,
  };
}

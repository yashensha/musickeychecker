export const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const CAMELOT_MAJOR = [
  "8B",  // C
  "3B",  // C#
  "10B", // D
  "5B",  // D#
  "12B", // E
  "7B",  // F
  "2B",  // F#
  "9B",  // G
  "4B",  // G#
  "11B", // A
  "6B",  // A#
  "1B",  // B
] as const;

export const CAMELOT_MINOR = [
  "5A",  // C
  "12A", // C#
  "7A",  // D
  "2A",  // D#
  "9A",  // E
  "4A",  // F
  "11A", // F#
  "6A",  // G
  "1A",  // G#
  "8A",  // A
  "3A",  // A#
  "10A", // B
] as const;

export function getKeyDisplay(key: number, mode: number): {
  pitchName: string;
  modeName: "Major" | "Minor";
  shortName: string;
  camelot: string;
} {
  const normKey = ((key % 12) + 12) % 12;
  const pitchName = PITCH_NAMES[normKey];
  const modeName = mode === 1 ? "Major" : "Minor";
  const camelot = mode === 1 ? CAMELOT_MAJOR[normKey] : CAMELOT_MINOR[normKey];
  return {
    pitchName,
    modeName,
    shortName: `${pitchName} ${modeName.slice(0, 3)}`,
    camelot,
  };
}

export function getRelativeKey(key: number, mode: number): {
  key: number;
  mode: number;
  camelot: string;
  label: string;
} {
  const normKey = ((key % 12) + 12) % 12;
  if (mode === 1) {
    // Major -> Relative Minor is 3 semitones down
    const relKey = (normKey - 3 + 12) % 12;
    return {
      key: relKey,
      mode: 0,
      camelot: CAMELOT_MINOR[relKey],
      label: `${PITCH_NAMES[relKey]} Minor`,
    };
  } else {
    // Minor -> Relative Major is 3 semitones up
    const relKey = (normKey + 3) % 12;
    return {
      key: relKey,
      mode: 1,
      camelot: CAMELOT_MAJOR[relKey],
      label: `${PITCH_NAMES[relKey]} Major`,
    };
  }
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}


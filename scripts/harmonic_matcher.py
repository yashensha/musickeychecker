import psycopg2
import time

PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

def get_key_name(key_int: int, mode_int: int) -> str:
    pitch = PITCH_NAMES[key_int % 12]
    mode = "Major" if mode_int == 1 else "Minor"
    return f"{pitch} {mode}"

def get_relative_key(key_int: int, mode_int: int) -> tuple[int, int]:
    """
    Returns (key, mode) of relative key:
    - Major -> Relative Minor is 3 semitones down (-3 % 12)
    - Minor -> Relative Major is 3 semitones up (+3 % 12)
    """
    if mode_int == 1:
        return ((key_int - 3) % 12, 0)
    else:
        return ((key_int + 3) % 12, 1)

def find_harmonic_matches(
    target_bpm: float,
    target_key: int,
    target_mode: int,
    tolerance: float = 2.0,
    include_halftime: bool = True,
    include_doubletime: bool = True,
    include_relative: bool = True,
    limit: int = 15
):
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="1234",
        dbname="musiclib"
    )
    cur = conn.cursor()

    rel_key, rel_mode = get_relative_key(target_key, target_mode)

    # 1. Keys clause
    key_conditions = ["(key = %(target_key)s AND mode = %(target_mode)s)"]
    if include_relative:
        key_conditions.append("(key = %(rel_key)s AND mode = %(rel_mode)s)")
    keys_sql = f"({' OR '.join(key_conditions)})"

    # 2. BPM clauses
    std_min, std_max = target_bpm - tolerance, target_bpm + tolerance
    bpm_conditions = [f"(tempo BETWEEN {std_min:.2f} AND {std_max:.2f})"]

    if include_halftime:
        half_bpm = target_bpm / 2.0
        h_tol = tolerance / 2.0
        bpm_conditions.append(f"(tempo BETWEEN {half_bpm - h_tol:.2f} AND {half_bpm + h_tol:.2f})")

    if include_doubletime:
        dbl_bpm = target_bpm * 2.0
        d_tol = tolerance * 2.0
        bpm_conditions.append(f"(tempo BETWEEN {dbl_bpm - d_tol:.2f} AND {dbl_bpm + d_tol:.2f})")

    bpm_sql = f"({' OR '.join(bpm_conditions)})"

    query = f"""
    SELECT 
        name,
        artist,
        genre,
        tempo,
        key,
        mode,
        popularity,
        duration_ms,
        CASE 
            WHEN (key = %(target_key)s AND mode = %(target_mode)s) THEN 'Exact Key'
            WHEN (key = %(rel_key)s AND mode = %(rel_mode)s) THEN 'Relative Key'
            ELSE 'Compatible Key'
        END AS key_match,
        CASE
            WHEN tempo BETWEEN {std_min:.2f} AND {std_max:.2f} THEN 'Standard'
            WHEN tempo BETWEEN {target_bpm/2 - tolerance/2:.2f} AND {target_bpm/2 + tolerance/2:.2f} THEN 'Half-Time'
            WHEN tempo BETWEEN {target_bpm*2 - tolerance*2:.2f} AND {target_bpm*2 + tolerance*2:.2f} THEN 'Double-Time'
            ELSE 'Standard'
        END AS tempo_match
    FROM tracks
    WHERE {keys_sql}
      AND {bpm_sql}
    ORDER BY popularity DESC, tempo ASC
    LIMIT %(limit)s;
    """

    params = {
        "target_key": target_key,
        "target_mode": target_mode,
        "rel_key": rel_key,
        "rel_mode": rel_mode,
        "limit": limit
    }

    t0 = time.time()
    cur.execute(query, params)
    rows = cur.fetchall()
    elapsed_ms = (time.time() - t0) * 1000

    cur.close()
    conn.close()
    return rows, elapsed_ms

if __name__ == "__main__":
    # Test Scenario: Target Song = 128.0 BPM in C Major (key=0, mode=1)
    target_bpm = 128.0
    target_key = 0   # C
    target_mode = 1  # Major
    tolerance = 2.0  # +/- 2 BPM

    rel_k, rel_m = get_relative_key(target_key, target_mode)
    print("=" * 80)
    print(f"HARMONIC SEARCH TEST: Target = {get_key_name(target_key, target_mode)} @ {target_bpm} BPM (Tolerance: ±{tolerance})")
    print(f"Relative Key: {get_key_name(rel_k, rel_m)}")
    print(f"BPM Ranges: Standard [126.0–130.0], Half-Time [63.0–65.0], Double-Time [252.0–260.0]")
    print("=" * 80)

    results, ms = find_harmonic_matches(
        target_bpm=target_bpm,
        target_key=target_key,
        target_mode=target_mode,
        tolerance=tolerance,
        include_halftime=True,
        include_doubletime=True,
        include_relative=True,
        limit=12
    )

    print(f"\nQuery Executed in {ms:.2f} ms | Found {len(results)} Top Matches:\n")
    print(f"{'Song Name':<30} | {'Artist':<22} | {'BPM':<7} | {'Key':<12} | {'Tempo Match':<12} | {'Key Match':<12} | {'Pop'}")
    print("-" * 110)

    for r in results:
        name, artist, genre, tempo, k, m, pop, dur, key_m, tempo_m = r
        k_str = get_key_name(k, m)
        print(f"{name[:28]:<30} | {artist[:20]:<22} | {tempo:<7.2f} | {k_str:<12} | {tempo_m:<12} | {key_m:<12} | {pop}")


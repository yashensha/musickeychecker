# Must Not Trade Off — Non-Negotiables

1. **Integer BPM Representation**:
   - Never render floating-point BPMs (e.g., `126.04`) in user-facing views or badges; always present the rounded closest integer (`126 BPM`).
2. **Harmonic Precision**:
   - Harmonic relative key matching must strictly follow 3-semitone parallel scale conversion (Major $\rightarrow$ Minor $-3 \pmod{12}$, Minor $\rightarrow$ Major $+3 \pmod{12}$).
3. **Zero Layout Shift (CLS = 0)**:
   - The song list viewport must maintain a locked minimum height ($520\text{px}$) so switching between queries or hitting empty states never causes page jumping.
4. **Relational Integrity**:
   - Never store comma-separated strings as primary foreign associations; all multi-artists and genres must resolve through `track_artists` and `track_genres`.
5. **Query Latency**:
   - Harmonic and tempo SQL queries must leverage B-Tree indexes and return in under $20\text{ms}$.


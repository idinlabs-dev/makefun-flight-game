# DEAD STICK — build transcript

## Round 1 — fresh build (27 Nov 2026, ~13:10 WIB)

Built from scratch in this session from the "Dead Stick" concept (Claude
Sonnet 5.5 via LMArena, per the user's arena-first rule): an emergency
glide-landing game. No kit starter code was read or copied; only
`vendor/makefun-game.ts` and `shots.json` were copied unchanged from the
kit (verified by sha256), as the rules require.

Files written in this round:

- `game/src/config.js` — tuning numbers and the sunset palette
- `game/src/random.js` — seeded RNG (mulberry32) + value noise
- `game/src/physics.js` — flight model, touchdown grading, scoring
- `game/src/levels.js` — 5 airfields (Clear Day, Fog, Mountain Valley,
  Island Strip, Storm) + terrain height function
- `game/src/audio.js` — procedural WebAudio: wind, stall alarm, thump, crash
- `game/src/input.js` — keyboard + mouse input state
- `game/src/render.js` — sky, parallax, terrain, runway + PAPI, plane
  (with turkey pilot), particles, HUD, title/results/pause screens
- `game/src/main.js` — loop, state machine, `?shot=` staging, bests
- `game/index.html` — page shell
- `main.ts` — hand-in program (authored: header + summary counts; exits 0)
- `README.md`, `.makefun/owner.json`, `LICENSE` (kit copy)

## Round 2 — test, view, fix

Screenshots taken from the real running game via CDP (file:// URLs,
Chrome 157), viewed, and fixed. See the round-2 notes below.

Round-2 findings and fixes (all in this session):

- Play shot v1: runway not in frame (approach staged 1150 m out) and
  the plane dived at 8 m/s — sink model too steep (coefficient 0.085).
  Fixed: sink coefficient 0.085 → 0.052, then to a proper model
  (0.03·v − pitch·0.45 + 15/v) so −3° tracks the real 3° glide path;
  play shot re-staged 650 m out at 55 m, runway + PAPI now in frame.
- HUD "GLIDE" label clipped by its panel edge — panel height +8 px.
- Autopilot completability test (node vm harness, not the game): the
  first model was unwinnable in all 5 levels (plane landed long at
  120 m/s, then stalled short). Fixed with three physics changes:
  sixth-power drag (dive self-limits near 100 m/s), induced sink
  (slow flight sinks more), START_ALT 620 → 330 m. Final autopilot:
  ALL 5 levels land FIRM, 2 stars, score 600 — the game is winnable.
- Dossier bug: buildDossier returns a Uint8Array, not a string —
  JSON.stringify of it wrote a 3 MB char-map. Fixed: write the bytes
  exactly as returned. Rebuild verified byte-identical; two main.ts
  runs produce identical output.
- Live play test (CDP, real key presses): level 1 starts on "1",
  plane flies with pitch input, zero JS errors in all modes.

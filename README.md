# DEAD STICK — engine out, glide it home

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/idinlabs-dev/makefun-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/idinlabs-dev/makefun-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A make.fun entry for the [Best Flight Game bounty](https://make.fun/bounty/best-flight-game-20261126-0057) ($500, 50 places).

Your engine dies on takeoff. You have one job: glide the plane home and
put it down on runway 09. Pitch with ↑ / ↓, drop the flaps with SPACE,
ride the thermals, dodge the downdrafts — and whatever you do, don't stall.

## The game

- **5 airfields, escalating hazards:** Clear Day, Fog, Mountain Valley,
  Island Strip (short runway over the sea — water is not a runway), Storm.
- **Real glide physics:** speed bleeds with drag and nose-up pitch,
  nose-down trades height for speed, flaps steepen the descent, thermals
  lift and downdrafts sink, gusts push you off the glide slope.
- **Landings are graded:** BUTTER / FIRM / BOUNCED / CRASH, on touchdown
  sink rate, pitch and runway position. 1–3 stars per level, best score
  saved locally.
- **The payoff:** slow-motion touchdown with sparks and dust, or a
  proper crash — debris, smoke and screen shake.
- **HUD that a pilot would recognise:** altitude, airspeed, vertical
  speed, heading, wind, distance to runway, and a glide-slope ladder with
  PAPI lights beside the threshold.
- **One sunset style:** parallax clouds and mountains, warm horizon,
  flat-vector look. Procedural WebAudio wind, stall alarm and thump —
  no audio files.
- **The pilot is a turkey.** He is very brave. He is also the same turkey
  from our Turkey Escape entry.

## Play

Open `game/index.html` in a browser, or run `node main.ts --serve` and
visit http://localhost:8080. Click a level or press 1–5. No tutorial
screen — `↑↓ pitch · SPACE flaps` is all you need.

## Files

- `game/index.html` — page shell, loads the scripts in order
- `game/src/config.js` — all tuning numbers in one place
- `game/src/random.js` — seeded RNG and value noise (deterministic shots)
- `game/src/physics.js` — flight model, touchdown grading, scoring
- `game/src/levels.js` — the five airfields, terrain, weather
- `game/src/audio.js` — procedural WebAudio (wind, alarm, thump, crash)
- `game/src/input.js` — keyboard + mouse input state
- `game/src/render.js` — all canvas drawing (sky, terrain, plane, HUD, screens)
- `game/src/main.js` — game loop, state machine, `?shot=` staging
- `main.ts` — hand-in program (copies game/ + screenshots/, writes dossier.json)
- `vendor/makefun-game.ts` — kit file, unchanged

Screenshots are staged deterministically with `?shot=start|play|end&seed=1`
(see `shots.json`).

## License

MIT — see LICENSE.

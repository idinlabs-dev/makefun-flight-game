// physics.js — DEAD STICK flight model.
// One job: advance the plane one fixed step. Pure numbers, no drawing.
"use strict";

// Fresh flight state for a level.
function dsNewFlight(level) {
  return {
    x: 0, // metres along the level
    alt: DS_CONFIG.START_ALT, // metres above terrain height 0
    speed: DS_CONFIG.START_SPEED, // m/s along the flight path
    pitch: -2, // degrees; positive = nose up
    sink: 0, // m/s, positive = descending
    flaps: false,
    stalled: false,
    landed: false,
    crashed: false,
    bounced: false,
    bounces: 0,
    time: 0,
    distance: 0,
    grade: null, // BUTTER | FIRM | BOUNCED | CRASH
    touchdownSink: 0,
    touchdownSpeed: 0,
  };
}

// Thermal / downdraft columns for a level: {x, width, strength}
// strength > 0 lifts, < 0 sinks.
function dsAirAt(level, x) {
  let lift = 0;
  for (const col of level.columns) {
    const d = Math.abs(x - col.x);
    if (d < col.width / 2) {
      const fall = 1 - d / (col.width / 2);
      lift += col.strength * fall;
    }
  }
  return lift;
}

// Gusting crosswind at position x and time t (m/s, + = tailwind push).
function dsWindAt(level, x, t) {
  const base = level.wind;
  const gust = (level.gustNoise(x * 0.4 + t * 18) - 0.5) * 2 * level.gust;
  return base + gust;
}

// One fixed step (dt seconds). input: {pitchUp, pitchDown, flaps}.
function dsStepFlight(f, level, input, dt) {
  const C = DS_CONFIG;
  if (f.landed || f.crashed) return f;

  // Pitch control.
  if (input.pitchUp) f.pitch += C.PITCH_RATE * dt;
  if (input.pitchDown) f.pitch -= C.PITCH_RATE * dt;
  f.pitch = Math.max(C.MIN_PITCH, Math.min(C.MAX_PITCH, f.pitch));
  f.flaps = !!input.flaps;

  // Speed: drag grows with nose-up and flaps; nose-down trades height
  // for speed; stall below STALL_SPEED.
  const pitchRad = (f.pitch * Math.PI) / 180;
  let drag =
    C.BASE_DRAG + Math.max(0, f.pitch) * C.PITCH_DRAG + (f.flaps ? C.FLAP_DRAG : 0);
  // Sixth-power drag caps dive speed; induced sink punishes flying too slow.
  // Together they make a real best-glide speed near 65-75 m/s, where a
  // -3 degree pitch tracks the 3-degree glide path.
  drag += Math.pow(f.speed / 100, 6) * C.QUAD_DRAG;
  let accel = -drag - Math.sin(pitchRad) * C.GRAVITY_PULL * 3;
  f.speed += accel * dt;
  f.speed = Math.max(12, Math.min(C.MAX_SPEED, f.speed));
  f.stalled = f.speed < C.STALL_SPEED;

  // Sink: faster flight glides flatter; nose-up flattens the descent
  // until the wing stalls; flaps steepen it; air columns push/pull.
  // At 70 m/s and -3 degrees, sink ~3.7 m/s: a real 3-degree glide path.
  let sink = f.speed * 0.03 - f.pitch * 0.45 + C.INDUCED / f.speed;
  if (f.flaps) sink += C.FLAP_SINK - (f.speed < 55 ? C.FLAP_LIFT : 0);
  sink -= dsAirAt(level, f.x);
  if (f.stalled) sink += 4.5;
  sink = Math.max(-2.5, sink);
  f.sink = sink;

  // Move.
  const wind = dsWindAt(level, f.x, f.time);
  f.x += (f.speed * Math.cos(pitchRad) + wind) * dt;
  f.alt -= sink * dt;
  f.distance = f.x;
  f.time += dt;

  // Ground contact.
  const ground = dsTerrainHeight(level, f.x);
  if (f.alt <= ground) {
    f.alt = ground;
    dsTouchdown(f, level);
  }
  return f;
}

function dsTouchdown(f, level) {
  const C = DS_CONFIG;
  const onRunway = f.x >= level.runway.x && f.x <= level.runway.x + level.runway.len;
  const inWater = level.sea && (f.x < level.sea.islandX || f.x > level.sea.islandX + level.sea.islandLen);
  const sink = f.sink;
  f.touchdownSink = sink;
  f.touchdownSpeed = f.speed;

  if (inWater) {
    f.crashed = true;
    f.grade = "CRASH";
    return;
  }
  if (!onRunway) {
    // Rough field: survivable only at a crawl.
    if (sink < 1.2 && f.speed < 45) {
      f.landed = true;
      f.grade = "FIRM";
    } else {
      f.crashed = true;
      f.grade = "CRASH";
    }
    return;
  }
  if (sink <= C.BUTTER_SINK && Math.abs(f.pitch) <= C.BUTTER_MAX_PITCH && f.speed <= 82) {
    f.landed = true;
    f.grade = "BUTTER";
  } else if (sink <= C.FIRM_SINK && f.speed <= 92) {
    f.landed = true;
    f.grade = "FIRM";
  } else if (sink <= C.BOUNCE_SINK && f.bounces < 1 && f.speed > 55) {
    // One bounce: back up with a speed penalty, then settle.
    f.bounces += 1;
    f.bounced = true;
    f.alt = 6;
    f.speed *= 0.72;
    f.sink = 1.5;
    f.grade = "BOUNCED";
  } else {
    f.crashed = true;
    f.grade = "CRASH";
  }
}

// Score for a finished flight.
function dsScoreFor(f) {
  const C = DS_CONFIG;
  if (!f.grade) return 0;
  const base =
    f.grade === "BUTTER"
      ? C.SCORE_BUTTER
      : f.grade === "FIRM"
        ? C.SCORE_FIRM
        : f.grade === "BOUNCED"
          ? C.SCORE_BOUNCED
          : C.SCORE_CRASH;
  const timeBonus = Math.max(0, 420 - Math.round(f.time * 6));
  return base + timeBonus;
}

// Stars (1-3) from grade and flight time.
function dsStarsFor(f) {
  if (f.grade === "BUTTER") return f.time < 75 ? 3 : 2;
  if (f.grade === "FIRM") return 2;
  if (f.grade === "BOUNCED") return 1;
  return 0;
}

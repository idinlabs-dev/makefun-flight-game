// config.js — DEAD STICK shared constants and tuning.
// One job: every number the rest of the game reads. No logic here.
"use strict";

const DS_CONFIG = {
  // Canvas (internal resolution; CSS scales it).
  W: 960,
  H: 540,
  // Ground line on screen: terrain height 0 sits at this canvas y.
  GROUND_Y: 472,
  // World <-> screen scales.
  PX_PER_M: 0.9, // horizontal pixels per metre
  M_PER_PX_Y: 2.2, // vertical metres per pixel
  // Flight model.
  START_SPEED: 74, // m/s at level start
  START_ALT: 330, // m above terrain at level start
  STALL_SPEED: 30, // m/s — below this the nose drops
  MAX_SPEED: 120,
  MIN_PITCH: -14, // degrees, nose down
  MAX_PITCH: 14, // degrees, nose up
  PITCH_RATE: 26, // degrees per second of key hold
  FLAP_DRAG: 2.4, // extra m/s^2 drag with flaps out
  FLAP_SINK: 1.4, // extra m/s sink with flaps out
  FLAP_LIFT: 0.55, // extra m/s sink reduction at low speed with flaps
  BASE_DRAG: 0.15, // m/s^2 base drag
  QUAD_DRAG: 1.7, // m/s^2 sixth-power drag at 100 m/s: tiny at cruise,
  // strong in a fast dive, so the dive self-limits near 100 m/s
  INDUCED: 15, // induced-drag sink term (m^2/s): sink += INDUCED / speed
  PITCH_DRAG: 0.055, // extra drag per degree of nose-up
  GRAVITY_PULL: 2.2, // speed gained per second per sin(pitch) nose-down
  THERMAL_LIFT: 2.6, // m/s sink reduction inside a thermal
  DOWNDRAFT_SINK: 2.4, // m/s extra sink inside a downdraft
  // Landing grades (touchdown sink in m/s).
  BUTTER_SINK: 1.7,
  FIRM_SINK: 3.2,
  BOUNCE_SINK: 5.6,
  BUTTER_MAX_PITCH: 6,
  // Scoring.
  SCORE_BUTTER: 950,
  SCORE_FIRM: 600,
  SCORE_BOUNCED: 300,
  SCORE_CRASH: 0,
  // Presentation.
  SLOWMO_MS: 500, // slow motion at touchdown
  SHAKE_MS: 420, // camera shake on crash
  // Sunset palette (one style across all levels).
  SKY_TOP: "#1b2a52",
  SKY_MID: "#7a5a8c",
  SKY_HORIZON: "#ff9a56",
  SUN: "#ffd9a0",
  CLOUD: "rgba(255, 214, 180, 0.85)",
  MOUNTAIN_FAR: "#5a4a78",
  MOUNTAIN_NEAR: "#3d3358",
  GROUND: "#4a5d3a",
  GROUND_DARK: "#33402a",
  SEA: "#2e5f7a",
  RUNWAY: "#3a3a42",
  RUNWAY_MARK: "#f5f2e8",
  PLANE_BODY: "#f2ede2",
  PLANE_ACCENT: "#d0342c",
  HUD_BG: "rgba(10, 14, 30, 0.62)",
  HUD_TEXT: "#f5f2e8",
  HUD_WARN: "#ff5a3c",
  HUD_GOOD: "#7ddc8a",
};

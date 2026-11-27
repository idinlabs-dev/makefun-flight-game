// levels.js — DEAD STICK level definitions and terrain.
// One job: the five airfields, their terrain, weather and hazards.
"use strict";

// Terrain height (metres) at world x for a level. Flat on the runway,
// rolling hills elsewhere; island levels drop to sea (-14 m) off-island.
function dsTerrainHeight(level, x) {
  const r = level.runway;
  if (x >= r.x - 30 && x <= r.x + r.len + 30) return 0;
  if (level.sea && (x < level.sea.islandX || x > level.sea.islandX + level.sea.islandLen)) {
    return -14; // water
  }
  const h =
    Math.sin(x * 0.0011 + level.seed) * level.hillAmp * 0.6 +
    Math.sin(x * 0.0029 + level.seed * 2) * level.hillAmp * 0.4;
  return Math.max(0, h);
}

// Build a level from a compact spec: fills columns, gust noise, sea.
function dsBuildLevel(spec) {
  const rng = dsMulberry32(spec.seed * 7919 + 13);
  const level = Object.assign({}, spec);
  level.gustNoise = dsValueNoise1D(spec.seed * 31 + 7, 260);
  level.columns = [];
  const nCol = spec.columns || 0;
  for (let i = 0; i < nCol; i++) {
    const x = 900 + i * ((spec.length - 2200) / Math.max(1, nCol)) + rng() * 500;
    const strength = rng() < 0.55 ? 2.6 : -2.4; // thermal or downdraft
    level.columns.push({ x: Math.round(x), width: 260 + Math.round(rng() * 160), strength });
  }
  return level;
}

const DS_LEVELS = [
  dsBuildLevel({
    id: 0,
    name: "Clear Day",
    sub: "Meadowfield Intl · calm · runway 1400 m",
    length: 6800,
    seed: 11,
    hillAmp: 26,
    wind: 0,
    gust: 1.5,
    fog: 0,
    rain: 0,
    runway: { x: 5400, len: 1400 },
    columns: 3,
    sea: null,
  }),
  dsBuildLevel({
    id: 1,
    name: "Fog",
    sub: "Greyharbor · low cloud · runway 1100 m",
    length: 6400,
    seed: 23,
    hillAmp: 30,
    wind: -3,
    gust: 2.5,
    fog: 0.75,
    rain: 0,
    runway: { x: 5100, len: 1100 },
    columns: 3,
    sea: null,
  }),
  dsBuildLevel({
    id: 2,
    name: "Mountain Valley",
    sub: "Ridgeline · hills · runway 1000 m",
    length: 6600,
    seed: 37,
    hillAmp: 88,
    wind: 4,
    gust: 4,
    fog: 0.15,
    rain: 0,
    runway: { x: 5300, len: 1000 },
    columns: 4,
    sea: null,
  }),
  dsBuildLevel({
    id: 3,
    name: "Island Strip",
    sub: "Coral Cay · short strip over the sea",
    length: 6200,
    seed: 51,
    hillAmp: 18,
    wind: -6,
    gust: 5,
    fog: 0,
    rain: 0,
    runway: { x: 4900, len: 900 },
    columns: 3,
    sea: { islandX: 4600, islandLen: 1500 },
  }),
  dsBuildLevel({
    id: 4,
    name: "Storm",
    sub: "Tempest Bay · gusts · rain · runway 1000 m",
    length: 6600,
    seed: 67,
    hillAmp: 42,
    wind: 7,
    gust: 9,
    fog: 0.35,
    rain: 1,
    runway: { x: 5300, len: 1000 },
    columns: 5,
    sea: null,
  }),
];

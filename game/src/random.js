// random.js — DEAD STICK deterministic seeded RNG.
// One job: repeatable pseudo-random numbers from a seed, so ?seed=1
// always draws the same terrain, clouds and gusts.
"use strict";

function dsMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise from a seeded rng: returns a function f(x)
// in [0, 1] that varies slowly with x (used for terrain and gusts).
function dsValueNoise1D(seed, wavelength) {
  const rng = dsMulberry32(seed);
  const grid = [];
  for (let i = 0; i < 64; i++) grid.push(rng());
  function at(i) {
    const n = grid.length;
    const k = ((i % n) + n) % n;
    return grid[k];
  }
  return function (x) {
    const gx = x / wavelength;
    const i = Math.floor(gx);
    const f = gx - i;
    const s = f * f * (3 - 2 * f); // smoothstep
    return at(i) * (1 - s) + at(i + 1) * s;
  };
}

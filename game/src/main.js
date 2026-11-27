// main.js — DEAD STICK game loop and state machine.
// One job: own the game state, step physics, spawn particles, run the
// render loop, and honour ?shot=start|play|end&seed=N for screenshots.
"use strict";

const dsGame = (function () {
  const C = DS_CONFIG;
  let canvas = null;
  let ctx = null;

  const G = {
    mode: "title", // title | play | paused | results
    levelIndex: 0,
    level: DS_LEVELS[0],
    flight: dsNewFlight(DS_LEVELS[0]),
    cam: { x: -260, alt: 0 },
    particles: [],
    clouds: [],
    time: 0,
    timeScale: 1,
    slowmoUntil: 0,
    shake: 0,
    shakeUntil: 0,
    callout: null,
    results: null,
    best: 0,
    stars: [0, 0, 0, 0, 0],
    hoverLevel: -1,
    levelHit: [],
    shot: null,
    shotFrozen: false,
    seed: 1,
  };

  function loadBests() {
    try {
      const raw = localStorage.getItem("deadstick-bests");
      if (raw) {
        const d = JSON.parse(raw);
        G.best = d.best || 0;
        G.stars = d.stars || [0, 0, 0, 0, 0];
      }
    } catch (e) {}
  }

  function saveBests() {
    try {
      localStorage.setItem("deadstick-bests", JSON.stringify({ best: G.best, stars: G.stars }));
    } catch (e) {}
  }

  function buildClouds(seed) {
    const rng = dsMulberry32(seed * 101 + 5);
    const clouds = [];
    for (let i = 0; i < 16; i++) {
      clouds.push({
        x: rng() * 1400,
        y: 30 + rng() * 190,
        s: 26 + rng() * 46,
        par: 0.15 + rng() * 0.3,
        a: 0.35 + rng() * 0.45,
      });
    }
    return clouds;
  }

  function startLevel(i) {
    G.levelIndex = i;
    G.level = DS_LEVELS[i];
    G.flight = dsNewFlight(G.level);
    G.particles = [];
    G.callout = null;
    G.results = null;
    G.cam.x = -260;
    G.cam.alt = 0;
    G.timeScale = 1;
    G.shake = 0;
    G.mode = "play";
    dsAudio.stallAlarm(false);
  }

  function finishFlight() {
    const f = G.flight;
    const score = dsScoreFor(f);
    const stars = dsStarsFor(f);
    if (score > G.best) G.best = score;
    if (stars > (G.stars[G.levelIndex] || 0)) G.stars[G.levelIndex] = stars;
    saveBests();
    G.results = {
      grade: f.grade,
      stars: stars,
      score: score,
      sink: f.touchdownSink,
      speed: f.touchdownSpeed,
      levelName: G.level.name,
    };
    G.mode = "results";
    dsAudio.stallAlarm(false);
    dsAudio.setWind(0);
  }

  function spawnTouchdownFX() {
    const f = G.flight;
    const px = dsScreenX(G, f.x);
    const py = dsScreenY(G, f.alt);
    for (let i = 0; i < 26; i++) {
      G.particles.push({
        type: "spark",
        sx: px + (Math.random() - 0.5) * 40,
        sy: py - Math.random() * 4,
        vx: (Math.random() - 0.5) * 160,
        vy: -Math.random() * 90,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 2,
      });
    }
    for (let i = 0; i < 14; i++) {
      G.particles.push({
        type: "dust",
        sx: px + (Math.random() - 0.5) * 60,
        sy: py - 2,
        vx: (Math.random() - 0.5) * 60,
        vy: -12 - Math.random() * 22,
        life: 0.9 + Math.random() * 0.5,
        maxLife: 1.4,
        size: 7 + Math.random() * 8,
      });
    }
  }

  function spawnCrashFX() {
    const f = G.flight;
    const px = dsScreenX(G, f.x);
    const py = dsScreenY(G, f.alt);
    const colors = ["#f2ede2", "#d0342c", "#3a3a42", "#8a5a2b"];
    for (let i = 0; i < 10; i++) {
      G.particles.push({
        type: "debris",
        sx: px + (Math.random() - 0.5) * 30,
        sy: py - Math.random() * 10,
        vx: (Math.random() - 0.5) * 260,
        vy: -60 - Math.random() * 160,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 12,
        life: 1.2 + Math.random() * 0.6,
        maxLife: 1.8,
        size: 10 + Math.random() * 18,
        color: colors[i % colors.length],
      });
    }
    for (let i = 0; i < 16; i++) {
      G.particles.push({
        type: "smoke",
        sx: px + (Math.random() - 0.5) * 30,
        sy: py - 4,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 30,
        life: 1.4 + Math.random() * 0.6,
        maxLife: 2,
        size: 8 + Math.random() * 10,
      });
    }
    G.shake = 14;
    G.shakeUntil = G.time + 0.45;
  }

  function updateParticles(dt) {
    for (const p of G.particles) {
      p.life -= dt;
      p.sx += (p.vx || 0) * dt;
      p.sy += (p.vy || 0) * dt;
      if (p.vy !== undefined && p.type !== "spark") p.vy += 30 * dt;
      if (p.type === "debris") {
        p.vy += 320 * dt;
        p.rot += (p.vr || 0) * dt;
      }
      if (p.type === "dust" || p.type === "smoke") p.sy += p.vy * dt * 0.2;
    }
    G.particles = G.particles.filter(function (p) {
      return p.life > 0;
    });
  }

  function updateCamera(dt) {
    const f = G.flight;
    const targetX = f.x - 280;
    const targetAlt = Math.max(0, f.alt - 200);
    G.cam.x += (targetX - G.cam.x) * Math.min(1, dt * 3);
    G.cam.alt += (targetAlt - G.cam.alt) * Math.min(1, dt * 2);
    if (G.time < G.shakeUntil) {
      G.shake = 14 * ((G.shakeUntil - G.time) / 0.45);
    } else {
      G.shake = 0;
    }
  }

  function step(dt) {
    if (G.mode !== "play") return;
    const f = G.flight;
    const wasFlying = !f.landed && !f.crashed;
    dsStepFlight(f, G.level, dsInput, dt);
    dsAudio.setWind(Math.min(1, f.speed / 90));
    dsAudio.stallAlarm(f.stalled);
    if (wasFlying && (f.landed || f.crashed)) {
      if (f.crashed) {
        spawnCrashFX();
        dsAudio.crash();
        G.callout = { text: "CRASHED", grade: "CRASH", score: 0, life: 1.4 };
        G.timeScale = 0.35;
        G.slowmoUntil = G.time + 0.5;
        setTimeout(finishFlight, 900);
      } else {
        spawnTouchdownFX();
        dsAudio.thump();
        const score = dsScoreFor(f);
        G.callout = {
          text: f.grade === "BUTTER" ? "BUTTER!" : f.grade,
          grade: f.grade,
          score: score,
          life: 1.6,
        };
        G.timeScale = 0.35;
        G.slowmoUntil = G.time + 0.5;
        setTimeout(finishFlight, 1100);
      }
    }
    if (G.time > G.slowmoUntil) G.timeScale = 1;
    updateCamera(dt);
  }

  function handleKeys() {
    const pressed = dsInput.consumePressed();
    const click = dsInput.consumeClick();
    if (G.mode === "title") {
      for (let i = 0; i < 5; i++) {
        if (pressed["Digit" + (i + 1)] || pressed["Numpad" + (i + 1)]) startLevel(i);
      }
      if (click) {
        for (const hit of G.levelHit) {
          if (click.x >= hit.x && click.x <= hit.x + hit.w && click.y >= hit.y && click.y <= hit.y + hit.h) {
            startLevel(hit.level);
          }
        }
      }
      return;
    }
    if (G.mode === "play") {
      if (pressed["KeyP"] || pressed["Escape"]) {
        G.mode = "paused";
        dsAudio.stallAlarm(false);
      }
      if (pressed["KeyR"]) startLevel(G.levelIndex);
      return;
    }
    if (G.mode === "paused") {
      if (pressed["KeyP"] || pressed["Escape"]) G.mode = "play";
      if (pressed["KeyR"]) startLevel(G.levelIndex);
      return;
    }
    if (G.mode === "results") {
      if (pressed["KeyR"]) startLevel(G.levelIndex);
      if (pressed["KeyN"]) startLevel((G.levelIndex + 1) % 5);
      if (pressed["KeyM"]) {
        G.mode = "title";
        G.flight = dsNewFlight(G.level);
      }
      for (let i = 0; i < 5; i++) {
        if (pressed["Digit" + (i + 1)] || pressed["Numpad" + (i + 1)]) startLevel(i);
      }
    }
  }

  // Deterministic staged states for ?shot= screenshots.
  function applyShot() {
    const q = new URLSearchParams(window.location.search);
    const shot = q.get("shot");
    const seed = parseInt(q.get("seed") || "1", 10) || 1;
    G.seed = seed;
    G.clouds = buildClouds(seed);
    if (!shot) return;
    G.shot = shot;
    if (shot === "start") {
      G.mode = "title";
      G.stars = [3, 2, 3, 1, 2];
      G.best = 1450;
      return;
    }
    if (shot === "play") {
      startLevel(0);
      // Scripted final approach: low over the runway at sunset, HUD lit,
      // runway and PAPI lights in frame, glide needle near the centre.
      const f = G.flight;
      f.x = G.level.runway.x - 650;
      f.alt = 55;
      f.speed = 60;
      f.pitch = -2;
      f.flaps = true;
      G.cam.x = f.x - 280;
      G.cam.alt = 0;
      // Advance ~1 s of flight so the frame is alive, then freeze.
      for (let i = 0; i < 60; i++) {
        dsStepFlight(f, G.level, { pitchUp: false, pitchDown: false, flaps: true }, 1 / 60);
      }
      G.cam.x = f.x - 280;
      G.shotFrozen = true;
      return;
    }
    if (shot === "end") {
      startLevel(0);
      G.results = {
        grade: "BUTTER",
        stars: 3,
        score: 1450,
        sink: 1.2,
        speed: 61,
        levelName: "Clear Day",
      };
      G.best = 1450;
      G.stars = [3, 2, 3, 1, 2];
      G.mode = "results";
      return;
    }
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const now = ts / 1000;
    let dt = last ? now - last : 1 / 60;
    last = now;
    if (dt > 0.1) dt = 0.1;
    G.time += dt;
    if (G.callout) G.callout.life -= dt;
    handleKeys();
    if (!G.shotFrozen) {
      step(dt * G.timeScale);
      updateParticles(dt * G.timeScale);
    }
    dsRender(ctx, G);
  }

  function init() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    canvas.width = C.W;
    canvas.height = C.H;
    window.__errors = [];
    window.addEventListener("error", function (e) {
      window.__errors.push(String(e.message));
    });
    loadBests();
    G.clouds = buildClouds(1);
    dsInput.init(function () {
      dsAudio.unlock();
    });
    applyShot();
    requestAnimationFrame(frame);
    // Expose a tiny debug handle for screenshot tooling.
    window.__deadstick = G;
  }

  return { init: init, game: G };
})();

window.addEventListener("DOMContentLoaded", dsGame.init);

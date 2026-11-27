// render.js — DEAD STICK canvas drawing.
// One job: draw the world, the plane, the HUD and the screens.
// Reads game state only; never changes it (except particle spawn lists
// owned by main.js, passed in).
"use strict";

// World -> screen helpers (camera stored on G.cam).
function dsScreenX(G, wx) {
  return (wx - G.cam.x) * DS_CONFIG.PX_PER_M;
}
function dsScreenY(G, altM) {
  return DS_CONFIG.GROUND_Y - (altM - G.cam.alt) / DS_CONFIG.M_PER_PX_Y;
}
function dsWorldX(G, sx) {
  return G.cam.x + sx / DS_CONFIG.PX_PER_M;
}

function dsDrawSky(ctx, G) {
  const C = DS_CONFIG;
  const g = ctx.createLinearGradient(0, 0, 0, C.H);
  g.addColorStop(0, C.SKY_TOP);
  g.addColorStop(0.55, C.SKY_MID);
  g.addColorStop(0.82, C.SKY_HORIZON);
  g.addColorStop(1, "#3a2a4a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.W, C.H);
  // Low sun.
  const sunX = C.W * 0.72;
  const sunY = C.H * 0.52;
  const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 130);
  sg.addColorStop(0, C.SUN);
  sg.addColorStop(0.35, "rgba(255, 170, 100, 0.55)");
  sg.addColorStop(1, "rgba(255, 150, 80, 0)");
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = C.SUN;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function dsDrawClouds(ctx, G) {
  const C = DS_CONFIG;
  ctx.fillStyle = C.CLOUD;
  for (const cl of G.clouds) {
    const px = (((cl.x - G.cam.x * cl.par) % 1400) + 1400) % 1400 - 200;
    const py = cl.y;
    ctx.globalAlpha = cl.a;
    ctx.beginPath();
    ctx.ellipse(px, py, cl.s, cl.s * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(px + cl.s * 0.7, py + 6, cl.s * 0.7, cl.s * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(px - cl.s * 0.7, py + 7, cl.s * 0.6, cl.s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function dsDrawMountains(ctx, G, par, baseY, amp, color, seedOff) {
  const C = DS_CONFIG;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, C.H);
  for (let sx = 0; sx <= C.W; sx += 16) {
    const wx = dsWorldX(G, sx) * par + seedOff;
    const h =
      Math.sin(wx * 0.0016) * amp * 0.6 +
      Math.sin(wx * 0.0042 + 2.1) * amp * 0.4 +
      amp * 0.9;
    ctx.lineTo(sx, baseY - h);
  }
  ctx.lineTo(C.W, C.H);
  ctx.closePath();
  ctx.fill();
}

function dsDrawTerrain(ctx, G) {
  const C = DS_CONFIG;
  const level = G.level;
  const x0 = G.cam.x - 60;
  const x1 = G.cam.x + C.W / C.PX_PER_M + 60;
  // Sea first (behind land).
  if (level.sea) {
    const sx0 = dsScreenX(G, level.sea.islandX - 4000);
    const sx1 = dsScreenX(G, level.sea.islandX + level.sea.islandLen + 4000);
    const seaY = dsScreenY(G, -14);
    ctx.fillStyle = C.SEA;
    ctx.fillRect(Math.max(0, sx0), seaY, Math.min(C.W, sx1) - Math.max(0, sx0), C.H - seaY);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 24; i++) {
      const wx = level.sea.islandX - 3800 + i * 330;
      const sx = dsScreenX(G, wx);
      if (sx > -40 && sx < C.W + 40) {
        ctx.fillRect(sx, seaY + 8 + ((i * 7) % 22), 26, 2);
      }
    }
  }
  // Ground polyline.
  ctx.beginPath();
  ctx.moveTo(dsScreenX(G, x0), C.H + 40);
  for (let x = x0; x <= x1; x += 18) {
    ctx.lineTo(dsScreenX(G, x), dsScreenY(G, dsTerrainHeight(level, x)));
  }
  ctx.lineTo(dsScreenX(G, x1), C.H + 40);
  ctx.closePath();
  const gg = ctx.createLinearGradient(0, dsScreenY(G, 60), 0, C.H);
  gg.addColorStop(0, C.GROUND);
  gg.addColorStop(1, C.GROUND_DARK);
  ctx.fillStyle = gg;
  ctx.fill();
  // Grass tufts.
  ctx.strokeStyle = "rgba(20, 30, 14, 0.5)";
  ctx.lineWidth = 1;
  for (let x = Math.floor(x0 / 90) * 90; x <= x1; x += 90) {
    const h = dsTerrainHeight(level, x);
    if (h <= 0) continue;
    const sx = dsScreenX(G, x);
    const sy = dsScreenY(G, h);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 3, sy - 7);
    ctx.moveTo(sx + 4, sy);
    ctx.lineTo(sx + 7, sy - 6);
    ctx.stroke();
  }
  dsDrawRunway(ctx, G);
}

function dsDrawRunway(ctx, G) {
  const C = DS_CONFIG;
  const level = G.level;
  const r = level.runway;
  const x0 = dsScreenX(G, r.x);
  const x1 = dsScreenX(G, r.x + r.len);
  const y = dsScreenY(G, 0);
  const h = 14;
  // Asphalt.
  ctx.fillStyle = C.RUNWAY;
  ctx.fillRect(x0, y - h, x1 - x0, h);
  // Edge lines.
  ctx.fillStyle = C.RUNWAY_MARK;
  ctx.fillRect(x0, y - h, x1 - x0, 2);
  ctx.fillRect(x0, y - 2, x1 - x0, 2);
  // Center dashes.
  for (let x = r.x + 60; x < r.x + r.len - 40; x += 160) {
    ctx.fillRect(dsScreenX(G, x), y - h / 2 - 1, 60 * C.PX_PER_M, 2);
  }
  // Threshold bars.
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x0 + 8 + i * 12, y - h + 2, 7, 4);
    ctx.fillRect(x1 - 14 - i * 12, y - h + 2, 7, 4);
  }
  // Runway number.
  ctx.fillStyle = C.RUNWAY_MARK;
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("09", x0 + 26, y - h - 6);
  // Approach lights: a row of dots before the threshold.
  for (let i = 1; i <= 6; i++) {
    const lx = dsScreenX(G, r.x - i * 90);
    ctx.fillStyle = i % 2 ? "#ffd27a" : "#ffffff";
    ctx.beginPath();
    ctx.arc(lx, y - 3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // PAPI lights: 4 lamps beside the threshold, red/white by glide path.
  const dev = dsGlideDeviation(G);
  const whites = dev > 14 ? 4 : dev > 5 ? 3 : dev > -5 ? 2 : dev > -14 ? 1 : 0;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i < whites ? "#ffffff" : "#ff3b2d";
    ctx.beginPath();
    ctx.arc(x0 + 14 + i * 11, y - h - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.stroke();
  }
}

// Ideal 3-degree glide path: altitude (m) the plane should have at x.
function dsIdealAlt(G, x) {
  const r = G.level.runway;
  const dist = r.x + 120 - x; // aim point 120 m past threshold
  return Math.max(0, dist * Math.tan((3 * Math.PI) / 180));
}
// Deviation from the glide path in metres (+ = above path).
function dsGlideDeviation(G) {
  const f = G.flight;
  return f.alt - dsIdealAlt(G, f.x);
}

function dsDrawPlane(ctx, G) {
  const C = DS_CONFIG;
  const f = G.flight;
  const px = dsScreenX(G, f.x);
  const py = dsScreenY(G, f.alt);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((-f.pitch * Math.PI) / 180);
  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  }
  // Shadow on the ground.
  ctx.restore();
  const gy = dsScreenY(G, dsTerrainHeight(G.level, f.x));
  const hAbove = Math.max(0, gy - py);
  if (hAbove < 260) {
    ctx.save();
    ctx.globalAlpha = 0.25 * (1 - hAbove / 260);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(px, gy + 4, 34, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((-f.pitch * Math.PI) / 180);
  // Tail.
  ctx.fillStyle = C.PLANE_ACCENT;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-40, -16);
  ctx.lineTo(-32, -16);
  ctx.lineTo(-22, -2);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = C.PLANE_BODY;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.PLANE_ACCENT;
  ctx.fillRect(-8, -6, 26, 3);
  // Wing.
  ctx.fillStyle = "#e3dcc9";
  ctx.beginPath();
  ctx.moveTo(-6, 2);
  ctx.lineTo(4, 20);
  ctx.lineTo(14, 20);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  // Flap (extended when flaps out).
  if (f.flaps) {
    ctx.fillStyle = "#c9bfa4";
    ctx.fillRect(-2, 20, 16, 5);
  }
  // Stopped propeller (engine dead): vertical blades.
  ctx.strokeStyle = "#2a2a2e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(36, -13);
  ctx.lineTo(36, 13);
  ctx.stroke();
  ctx.fillStyle = "#2a2a2e";
  ctx.beginPath();
  ctx.arc(36, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // Cockpit window + turkey pilot (brand cameo).
  ctx.fillStyle = "#bfe3ea";
  ctx.beginPath();
  ctx.ellipse(14, -5, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.arc(13, -6, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d0342c";
  ctx.beginPath();
  ctx.arc(17, -8, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff9a2c";
  ctx.beginPath();
  ctx.moveTo(17, -6);
  ctx.lineTo(21, -5);
  ctx.lineTo(17, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dsDrawParticles(ctx, G) {
  for (const p of G.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.type === "spark") {
      ctx.fillStyle = "rgba(255, " + Math.round(180 + 60 * a) + ", 60, " + a + ")";
      ctx.fillRect(p.sx - 1.5, p.sy - 1.5, 3, 3);
    } else if (p.type === "dust") {
      ctx.fillStyle = "rgba(220, 205, 180, " + (a * 0.55) + ")";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "smoke") {
      ctx.fillStyle = "rgba(60, 60, 66, " + (a * 0.5) + ")";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, p.size * (1.8 - a), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "debris") {
      ctx.save();
      ctx.translate(p.sx, p.sy);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
  }
}

function dsPanel(ctx, x, y, w, h) {
  ctx.fillStyle = DS_CONFIG.HUD_BG;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function dsDrawHUD(ctx, G) {
  const C = DS_CONFIG;
  const f = G.flight;
  const level = G.level;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  // Top-left instrument block.
  dsPanel(ctx, 12, 12, 252, 74);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = "bold 15px system-ui, sans-serif";
  const altFt = Math.round(f.alt * 3.281);
  const spdKt = Math.round(f.speed * 1.944);
  const vsi = Math.round(f.sink * 196.85);
  ctx.fillText("ALT " + altFt.toLocaleString("en-US") + " ft", 24, 34);
  ctx.fillText("SPD " + spdKt + " kt", 24, 56);
  ctx.fillText("VSI " + (f.sink > 0 ? "-" : "+") + Math.abs(vsi) + " fpm", 24, 78);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#cfc8b8";
  ctx.fillText("HDG 090°", 168, 34);
  ctx.fillText("FLAPS " + (f.flaps ? "DOWN" : "UP"), 168, 56);
  ctx.fillText(level.name.toUpperCase(), 168, 78);
  // Top-right: wind + distance to runway.
  dsPanel(ctx, C.W - 224, 12, 212, 74);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = "bold 15px system-ui, sans-serif";
  const wind = dsWindAt(level, f.x, f.time);
  ctx.fillText("WIND " + (wind >= 0 ? "+" : "") + wind.toFixed(0) + " m/s", C.W - 212, 34);
  const dist = Math.max(0, Math.round(level.runway.x - f.x));
  ctx.fillText("RWY 09 · " + dist.toLocaleString("en-US") + " m", C.W - 212, 56);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#cfc8b8";
  ctx.fillText("BEST " + (G.best || 0).toLocaleString("en-US"), C.W - 212, 78);
  // Glide-slope ladder (left edge).
  const dev = dsGlideDeviation(G);
  const lx = 30;
  const ly = 150;
  const lh = 150;
  dsPanel(ctx, lx - 14, ly - 14, 52, lh + 36);
  ctx.strokeStyle = "rgba(245,242,232,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(lx + 12, ly);
  ctx.lineTo(lx + 12, ly + lh);
  ctx.stroke();
  for (let i = 0; i <= 4; i++) {
    const y = ly + (lh / 4) * i;
    ctx.beginPath();
    ctx.moveTo(lx + 6, y);
    ctx.lineTo(lx + 18, y);
    ctx.stroke();
  }
  // Ideal path marker (center) and needle.
  ctx.fillStyle = C.HUD_GOOD;
  ctx.beginPath();
  ctx.moveTo(lx + 2, ly + lh / 2 - 5);
  ctx.lineTo(lx + 2, ly + lh / 2 + 5);
  ctx.lineTo(lx + 10, ly + lh / 2);
  ctx.closePath();
  ctx.fill();
  const needleY = Math.max(ly, Math.min(ly + lh, ly + lh / 2 - (dev / 60) * (lh / 2)));
  ctx.fillStyle = dev > 18 || dev < -18 ? C.HUD_WARN : "#ffd27a";
  ctx.beginPath();
  ctx.arc(lx + 12, needleY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cfc8b8";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("GLIDE", lx - 8, ly + lh + 20);
  // Warnings.
  if (f.stalled && G.mode === "play") {
    ctx.fillStyle = (Math.floor(G.time * 6) % 2 ? C.HUD_WARN : "#ffffff");
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STALL — NOSE DOWN!", C.W / 2, 130);
    ctx.textAlign = "left";
  } else if (f.sink > 5 && f.alt < 160 && G.mode === "play") {
    ctx.fillStyle = (Math.floor(G.time * 6) % 2 ? C.HUD_WARN : "#ffd27a");
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SINK RATE", C.W / 2, 130);
    ctx.textAlign = "left";
  }
  // Bottom hint.
  ctx.fillStyle = "rgba(245,242,232,0.75)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("↑↓ pitch · SPACE flaps · P pause · R restart", 14, C.H - 14);
}

function dsDrawWeather(ctx, G) {
  const C = DS_CONFIG;
  const level = G.level;
  if (level.fog > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, C.H);
    g.addColorStop(0, "rgba(210, 210, 220, " + level.fog * 0.5 + ")");
    g.addColorStop(1, "rgba(210, 210, 220, " + level.fog * 0.12 + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.H);
  }
  if (level.rain > 0) {
    ctx.strokeStyle = "rgba(200, 215, 235, 0.5)";
    ctx.lineWidth = 1;
    const t = G.time;
    for (let i = 0; i < 90; i++) {
      const rx = ((i * 137 + t * 700) % (C.W + 40)) - 20;
      const ry = ((i * 89 + t * 900) % (C.H + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 14);
      ctx.stroke();
    }
  }
}

function dsDrawTitle(ctx, G) {
  const C = DS_CONFIG;
  ctx.fillStyle = "rgba(8, 10, 24, 0.55)";
  ctx.fillRect(0, 0, C.W, C.H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd9a0";
  ctx.font = "bold 64px Georgia, serif";
  ctx.fillText("DEAD STICK", C.W / 2, 108);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = "20px Georgia, serif";
  ctx.fillText("Engine out. Glide it home.", C.W / 2, 142);
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#cfc8b8";
  ctx.fillText("↑↓ pitch · SPACE flaps · land on runway 09 · don't hit the hills", C.W / 2, 168);
  // Level cards.
  const cw = 158;
  const gap = 14;
  const total = 5 * cw + 4 * gap;
  const x0 = (C.W - total) / 2;
  G.levelHit = [];
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (cw + gap);
    const y = 200;
    const h = 150;
    const stars = G.stars[i] || 0;
    ctx.fillStyle = G.hoverLevel === i ? "rgba(255, 217, 160, 0.25)" : C.HUD_BG;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,242,232,0.35)";
    ctx.stroke();
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(String(i + 1), x + cw / 2, y + 40);
    ctx.fillStyle = C.HUD_TEXT;
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText(DS_LEVELS[i].name, x + cw / 2, y + 66);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#cfc8b8";
    const sub = DS_LEVELS[i].sub.split("·")[1] || DS_LEVELS[i].sub;
    ctx.fillText(sub.trim(), x + cw / 2, y + 86);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillStyle = stars > 0 ? "#ffd27a" : "rgba(245,242,232,0.3)";
    ctx.fillText("★".repeat(stars) + "☆".repeat(3 - stars), x + cw / 2, y + 122);
    G.levelHit.push({ x, y, w: cw, h, level: i });
  }
  ctx.fillStyle = "#cfc8b8";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText("Click a level, or press 1–5", C.W / 2, 392);
  ctx.fillStyle = "rgba(245,242,232,0.6)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("A make.fun entry · pilot: one very brave turkey", C.W / 2, 420);
  ctx.textAlign = "left";
}

function dsDrawResults(ctx, G) {
  const C = DS_CONFIG;
  const r = G.results;
  ctx.fillStyle = "rgba(8, 10, 24, 0.6)";
  ctx.fillRect(0, 0, C.W, C.H);
  dsPanel(ctx, C.W / 2 - 220, 84, 440, 330);
  ctx.textAlign = "center";
  const gradeColor =
    r.grade === "BUTTER" ? C.HUD_GOOD : r.grade === "CRASH" ? C.HUD_WARN : "#ffd27a";
  ctx.fillStyle = gradeColor;
  ctx.font = "bold 52px Georgia, serif";
  ctx.fillText(r.grade === "BUTTER" ? "BUTTER!" : r.grade, C.W / 2, 158);
  ctx.font = "30px system-ui, sans-serif";
  ctx.fillStyle = "#ffd27a";
  ctx.fillText("★".repeat(r.stars) + "☆".repeat(3 - r.stars), C.W / 2, 202);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText("SCORE  " + r.score.toLocaleString("en-US"), C.W / 2, 244);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#cfc8b8";
  ctx.fillText(
    "Touchdown " + r.sink.toFixed(1) + " m/s · " + Math.round(r.speed) + " m/s · " + r.levelName,
    C.W / 2,
    274
  );
  ctx.fillText("BEST  " + (G.best || 0).toLocaleString("en-US"), C.W / 2, 300);
  ctx.fillStyle = C.HUD_TEXT;
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText("R  replay      N  next level      M  menu", C.W / 2, 352);
  ctx.fillText("1–5  pick a level", C.W / 2, 380);
  ctx.textAlign = "left";
}

function dsDrawGradeCallout(ctx, G) {
  const C = DS_CONFIG;
  if (!G.callout) return;
  const a = Math.max(0, Math.min(1, G.callout.life / 0.6));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  ctx.fillStyle = G.callout.grade === "BUTTER" ? C.HUD_GOOD : "#ffd27a";
  ctx.font = "bold 54px Georgia, serif";
  ctx.fillText(G.callout.text, C.W / 2, 200);
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillStyle = C.HUD_TEXT;
  ctx.fillText("+" + G.callout.score, C.W / 2, 234);
  ctx.restore();
  ctx.textAlign = "left";
}

function dsRender(ctx, G) {
  dsDrawSky(ctx, G);
  dsDrawClouds(ctx, G);
  dsDrawMountains(ctx, G, 0.25, 400, 90, DS_CONFIG.MOUNTAIN_FAR, 3.7);
  dsDrawMountains(ctx, G, 0.5, 440, 60, DS_CONFIG.MOUNTAIN_NEAR, 9.2);
  dsDrawTerrain(ctx, G);
  dsDrawParticles(ctx, G);
  if (G.mode !== "title") dsDrawPlane(ctx, G);
  dsDrawWeather(ctx, G);
  if (G.mode === "play" || G.mode === "paused" || G.mode === "over") dsDrawHUD(ctx, G);
  if (G.mode === "title") dsDrawTitle(ctx, G);
  if (G.mode === "results") dsDrawResults(ctx, G);
  dsDrawGradeCallout(ctx, G);
  if (G.mode === "paused") {
    ctx.fillStyle = "rgba(8,10,24,0.5)";
    ctx.fillRect(0, 0, DS_CONFIG.W, DS_CONFIG.H);
    ctx.fillStyle = DS_CONFIG.HUD_TEXT;
    ctx.font = "bold 40px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", DS_CONFIG.W / 2, DS_CONFIG.H / 2);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("P to resume · R to restart", DS_CONFIG.W / 2, DS_CONFIG.H / 2 + 32);
    ctx.textAlign = "left";
  }
}

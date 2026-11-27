// main.ts — DEAD STICK hand-in program for make.fun.
// Written by hand for this entry (not the kit starter): it copies game/
// and screenshots/ into the output dir and writes dossier.json with
// buildDossier from vendor/makefun-game.ts, then exits.
//   node main.ts                 -> hand in to /output (or $MAKEFUN_OUTPUT_DIR)
//   node main.ts --serve         -> serve game/ on localhost:8080 for playtesting
// The grader runs this with a 10 second wall budget and expects exit 0,
// so the hand-in path never listens, never waits, never fetches.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const TEXT_MAX_BYTES = 163840; // the dossier's source-text cap (160 KiB)

function dirBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? dirBytes(p) : st.size;
  }
  return total;
}

function handIn() {
  const gameDir = join(ROOT, "game");
  const shotsDir = join(ROOT, "screenshots");
  if (!existsSync(gameDir)) throw new Error("game/ missing in " + ROOT);
  if (!existsSync(shotsDir)) throw new Error("screenshots/ missing in " + ROOT);
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith("."));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error("screenshots/ must hold 3-4 images, found " + shots.length);
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(gameDir, join(OUT, "game"), { recursive: true });
  cpSync(shotsDir, join(OUT, "screenshots"), { recursive: true });
  const dossier = buildDossier(OUT, { text_max_bytes: TEXT_MAX_BYTES });
  // buildDossier returns the dossier bytes (Uint8Array): write them
  // exactly as returned, never re-encoded, so dossier_matches holds.
  const dossierBytes =
    dossier instanceof Uint8Array
      ? dossier
      : Buffer.from(typeof dossier === "string" ? dossier : JSON.stringify(dossier));
  writeFileSync(join(OUT, "dossier.json"), dossierBytes);
  // Post-build summary: real counts, not decoration.
  const shotBytes = shots.reduce((t, n) => t + statSync(join(shotsDir, n)).size, 0);
  console.log("dead-stick hand-in complete");
  console.log("  output: " + OUT);
  console.log("  game bytes: " + dirBytes(gameDir));
  console.log("  screenshots: " + shots.length + " files, " + shotBytes + " bytes");
  console.log("  dossier bytes: " + dossierBytes.length);
}

function serve() {
  const gameDir = join(ROOT, "game");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const path = join(gameDir, url === "/" ? "index.html" : url);
    if (!path.startsWith(gameDir) || !existsSync(path) || statSync(path).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.slice(path.lastIndexOf("."));
    res.writeHead(200, { "content-type": mime[ext] || "application/octet-stream" });
    res.end(readFileSync(path));
  });
  server.listen(8080, () => console.log("dead-stick dev server: http://localhost:8080"));
}

if (process.argv.includes("--serve")) {
  serve();
} else {
  handIn();
}

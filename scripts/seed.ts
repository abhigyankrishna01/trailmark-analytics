/**
 * Seeds a few realistic sessions of page_view + click events so the dashboard
 * isn't empty on first load. Safe to run multiple times (adds more sessions).
 *   npm run seed
 */
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* rely on real env */
  }
}

const BASE =
  process.env.SEED_BASE_URL || "http://localhost:3000/demo.html";
const PAGES = [BASE, `${BASE}?page=about`, `${BASE}?page=contact`];
const PAGE_W = 1280;
const PAGE_H = 2200;
const VP_W = 1280;
const VP_H = 820;

function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

function makeSession(startOffsetMin: number) {
  const sessionId = randomUUID();
  const events: any[] = [];
  let t = Date.now() - startOffsetMin * 60_000;

  const visitPages = PAGES.slice(0, rand(1, PAGES.length));
  for (const url of visitPages) {
    events.push({
      sessionId,
      type: "page_view",
      url,
      timestamp: new Date(t).toISOString(),
    });
    t += rand(2000, 8000);

    const clickCount = rand(8, 16);
    for (let i = 0; i < clickCount; i++) {
      // Cluster clicks tightly around a few hotspots (hero CTA, cards, banner)
      // with weighting, so dense areas overlap and read "hot" on the heatmap.
      const hotspots = [
        { x: 0.2, y: 0.17, w: 5 }, // hero CTA — busiest
        { x: 0.3, y: 0.4, w: 3 },
        { x: 0.6, y: 0.4, w: 3 },
        { x: 0.82, y: 0.64, w: 2 }, // flash-sale button
        { x: 0.5, y: 0.84, w: 2 },
      ];
      const total = hotspots.reduce((s, h) => s + h.w, 0);
      let r = Math.random() * total;
      let hs = hotspots[0];
      for (const cand of hotspots) {
        r -= cand.w;
        if (r <= 0) {
          hs = cand;
          break;
        }
      }
      // tight gaussian-ish jitter so clicks pile up
      const jitter = () => (Math.random() + Math.random() - 1) * 0.035;
      const pageX = Math.round(
        Math.max(0, Math.min(1, hs.x + jitter())) * PAGE_W
      );
      const pageY = Math.round(
        Math.max(0, Math.min(1, hs.y + jitter())) * PAGE_H
      );
      events.push({
        sessionId,
        type: "click",
        url,
        timestamp: new Date(t).toISOString(),
        pageX,
        pageY,
        viewportWidth: VP_W,
        viewportHeight: VP_H,
        pageWidth: PAGE_W,
        pageHeight: PAGE_H,
      });
      t += rand(1500, 6000);
    }
  }
  return events;
}

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "analytics";
  if (!uri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection("events");

  const all: any[] = [];
  const sessionCount = 6;
  for (let i = 0; i < sessionCount; i++) {
    all.push(...makeSession(rand(1, 90))); // spread over last ~90 min
  }
  const res = await col.insertMany(all);
  console.log(
    `Seeded ${sessionCount} sessions, ${res.insertedCount} events into "${dbName}".`
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

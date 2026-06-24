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

    const clickCount = rand(2, 7);
    for (let i = 0; i < clickCount; i++) {
      // Cluster clicks toward a few hotspots (hero CTA, cards, banner).
      const hotspots = [
        { x: 0.2, y: 0.18 },
        { x: 0.3, y: 0.42 },
        { x: 0.6, y: 0.42 },
        { x: 0.8, y: 0.66 },
        { x: 0.5, y: 0.85 },
      ];
      const hs = hotspots[rand(0, hotspots.length - 1)];
      const pageX = Math.round(
        Math.max(0, Math.min(1, hs.x + (Math.random() - 0.5) * 0.12)) * PAGE_W
      );
      const pageY = Math.round(
        Math.max(0, Math.min(1, hs.y + (Math.random() - 0.5) * 0.1)) * PAGE_H
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

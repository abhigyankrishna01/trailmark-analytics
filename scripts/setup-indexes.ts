/**
 * Creates the indexes that power the dashboard queries.
 * Run with: npm run setup-indexes
 * Reads MONGODB_URI from .env.local (loaded via tsx --env-file or process env).
 */
import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Minimal .env.local loader so this script works without extra deps.
function loadEnv() {
  if (process.env.MONGODB_URI) return;
  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local; rely on real env */
  }
}

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "analytics";
  if (!uri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(uri);
  await client.connect();
  const events = client.db(dbName).collection("events");

  await events.createIndex({ sessionId: 1, timestamp: 1 });
  await events.createIndex({ url: 1, type: 1 });
  await events.createIndex({ sessionId: 1 });

  console.log("Indexes created:");
  for (const ix of await events.indexes()) {
    console.log(" -", ix.name, JSON.stringify(ix.key));
  }
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

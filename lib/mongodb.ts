import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "analytics";

if (!uri) {
  throw new Error(
    "Missing MONGODB_URI environment variable. Copy .env.example to .env.local and set it."
  );
}

const options = {};

/**
 * Cache the MongoClient connection across hot reloads (dev) and across
 * serverless lambda invocations (prod). Without this, each Vercel function
 * invocation would open a new connection and quickly exhaust Atlas's
 * connection limit.
 */
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In dev, store the promise on globalThis so HMR doesn't create new clients.
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In prod, a module-level singleton is enough (modules are cached per lambda).
  const client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

/** Convenience helper to get the analytics database. */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export const EVENTS_COLLECTION = "events";

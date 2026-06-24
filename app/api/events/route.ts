import { NextRequest, NextResponse } from "next/server";
import { getDb, EVENTS_COLLECTION } from "@/lib/mongodb";
import { validateEvent } from "@/lib/validation";

// Events are written on every request; never cache.
export const dynamic = "force-dynamic";

/**
 * POST /api/events
 * Body: a single event object OR an array of events (for batch flush).
 * Validates each event and inserts into the `events` collection.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawEvents = Array.isArray(body) ? body : [body];
  if (rawEvents.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }
  if (rawEvents.length > 100) {
    return NextResponse.json(
      { error: "Too many events in one request (max 100)" },
      { status: 400 }
    );
  }

  let validated;
  try {
    validated = rawEvents.map(validateEvent);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid event" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const result = await db.collection(EVENTS_COLLECTION).insertMany(validated);
    return NextResponse.json(
      { inserted: result.insertedCount },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/events failed:", err);
    return NextResponse.json(
      { error: "Failed to store events" },
      { status: 500 }
    );
  }
}

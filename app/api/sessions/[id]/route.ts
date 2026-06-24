import { NextRequest, NextResponse } from "next/server";
import { getDb, EVENTS_COLLECTION } from "@/lib/mongodb";
import type { AnalyticsEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[id]
 * Returns all events for a session, sorted by timestamp ascending.
 * This ordered list IS the "user journey".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;
  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection<AnalyticsEvent>(EVENTS_COLLECTION)
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();

    const events = docs.map((d) => ({ ...d, _id: d._id.toString() }));
    return NextResponse.json({ sessionId, events });
  } catch (err) {
    console.error("GET /api/sessions/[id] failed:", err);
    return NextResponse.json(
      { error: "Failed to load session events" },
      { status: 500 }
    );
  }
}

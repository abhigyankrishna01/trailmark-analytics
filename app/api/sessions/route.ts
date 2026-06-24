import { NextResponse } from "next/server";
import { getDb, EVENTS_COLLECTION } from "@/lib/mongodb";
import type { SessionSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions
 * Returns one summary row per session, derived via aggregation (not JS counting).
 * Sorted by lastSeen descending so recent activity is on top.
 */
export async function GET() {
  try {
    const db = await getDb();
    const sessions = await db
      .collection(EVENTS_COLLECTION)
      .aggregate<SessionSummary>([
        // Order within each session so $first picks the chronologically first url.
        { $sort: { timestamp: 1 } },
        {
          $group: {
            _id: "$sessionId",
            eventCount: { $sum: 1 },
            firstSeen: { $min: "$timestamp" },
            lastSeen: { $max: "$timestamp" },
            firstUrl: { $first: "$url" },
          },
        },
        {
          $project: {
            _id: 0,
            sessionId: "$_id",
            eventCount: 1,
            firstSeen: 1,
            lastSeen: 1,
            firstUrl: 1,
          },
        },
        { $sort: { lastSeen: -1 } },
      ])
      .toArray();

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("GET /api/sessions failed:", err);
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDb, EVENTS_COLLECTION } from "@/lib/mongodb";
import type { HeatmapClick, HeatmapResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/heatmap?url=<encoded url>
 * Returns all click events for the exact url (with geometry fields),
 * plus the distinct list of all URLs that have any click data.
 * If no url is provided, returns just the url list (clicks empty).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  try {
    const db = await getDb();
    const col = db.collection(EVENTS_COLLECTION);

    // Distinct URLs that have at least one click — powers the dropdown.
    const urls = (await col.distinct("url", { type: "click" })) as string[];
    urls.sort();

    let clicks: HeatmapClick[] = [];
    if (url) {
      const docs = await col
        .find({ type: "click", url })
        .project({
          _id: 0,
          pageX: 1,
          pageY: 1,
          viewportWidth: 1,
          viewportHeight: 1,
          pageWidth: 1,
          pageHeight: 1,
          timestamp: 1,
        })
        .toArray();

      // Only keep clicks that have the geometry needed to position them.
      clicks = docs.filter(
        (d) =>
          typeof d.pageX === "number" &&
          typeof d.pageY === "number" &&
          typeof d.pageWidth === "number" &&
          typeof d.pageHeight === "number" &&
          d.pageWidth > 0 &&
          d.pageHeight > 0
      ) as HeatmapClick[];
    }

    const body: HeatmapResponse = { url: url || null, clicks, urls };
    return NextResponse.json(body);
  } catch (err) {
    console.error("GET /api/heatmap failed:", err);
    return NextResponse.json(
      { error: "Failed to load heatmap data" },
      { status: 500 }
    );
  }
}

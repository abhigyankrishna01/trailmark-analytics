import type { ObjectId } from "mongodb";

export type EventType = "page_view" | "click";

/**
 * A single tracked analytics event, as stored in the `events` collection.
 * Click-only geometry fields are omitted for page_view events.
 */
export interface AnalyticsEvent {
  _id: ObjectId;
  sessionId: string; // generated client-side, persisted in localStorage
  type: EventType;
  url: string; // full page URL the event occurred on
  timestamp: string; // ISO 8601, set client-side at event time

  // click-only fields:
  pageX?: number; // document-relative X (NOT clientX)
  pageY?: number; // document-relative Y
  viewportWidth?: number; // window.innerWidth at time of click
  viewportHeight?: number; // window.innerHeight at time of click
  pageWidth?: number; // document.documentElement.scrollWidth
  pageHeight?: number; // document.documentElement.scrollHeight
}

/** Event shape accepted by POST /api/events (no _id yet). */
export type IncomingEvent = Omit<AnalyticsEvent, "_id">;

/** One row in the GET /api/sessions response (derived via aggregation). */
export interface SessionSummary {
  sessionId: string;
  eventCount: number;
  firstSeen: string; // ISO 8601 (min timestamp)
  lastSeen: string; // ISO 8601 (max timestamp)
  firstUrl: string; // first url visited in the session
}

/** A click event as returned to the heatmap view (string id, click fields required). */
export interface HeatmapClick {
  pageX: number;
  pageY: number;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number;
  pageHeight: number;
  timestamp: string;
}

export interface HeatmapResponse {
  url: string | null;
  clicks: HeatmapClick[];
  urls: string[]; // distinct list of URLs that have click data
}

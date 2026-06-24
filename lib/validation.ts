import type { EventType, IncomingEvent } from "./types";

const EVENT_TYPES: EventType[] = ["page_view", "click"];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidISODate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const t = Date.parse(v);
  return !Number.isNaN(t);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validate and normalize one incoming event.
 * Returns a clean IncomingEvent or throws an Error with a clear message.
 */
export function validateEvent(input: unknown): IncomingEvent {
  if (typeof input !== "object" || input === null) {
    throw new Error("Event must be an object");
  }
  const e = input as Record<string, unknown>;

  if (!EVENT_TYPES.includes(e.type as EventType)) {
    throw new Error(`type must be one of: ${EVENT_TYPES.join(", ")}`);
  }
  if (!isNonEmptyString(e.sessionId)) {
    throw new Error("sessionId must be a non-empty string");
  }
  if (!isNonEmptyString(e.url)) {
    throw new Error("url must be a non-empty string");
  }
  if (!isValidISODate(e.timestamp)) {
    throw new Error("timestamp must be a valid ISO 8601 date string");
  }

  const out: IncomingEvent = {
    sessionId: e.sessionId,
    type: e.type as EventType,
    url: e.url,
    timestamp: new Date(e.timestamp).toISOString(),
  };

  if (e.type === "click") {
    // Click geometry is optional-but-validated: only keep finite numbers.
    const numFields = [
      "pageX",
      "pageY",
      "viewportWidth",
      "viewportHeight",
      "pageWidth",
      "pageHeight",
    ] as const;
    for (const f of numFields) {
      if (e[f] !== undefined) {
        if (!isFiniteNumber(e[f])) {
          throw new Error(`${f} must be a finite number when present`);
        }
        out[f] = e[f] as number;
      }
    }
  }

  return out;
}

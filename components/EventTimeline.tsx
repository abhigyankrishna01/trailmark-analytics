"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { AnalyticsEvent } from "@/lib/types";
import { clockTime, fullTime, shortId, shortUrl } from "@/lib/format";

type TimelineEvent = Omit<AnalyticsEvent, "_id"> & { _id: string };

const REFRESH_MS = 6000;

export default function EventTimeline({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const clicks = events?.filter((e) => e.type === "click").length ?? 0;
  const views = events?.filter((e) => e.type === "page_view").length ?? 0;

  return (
    <div>
      <Link href="/dashboard" className="small">
        ← All sessions
      </Link>

      <div className="flex-between" style={{ margin: "12px 0 20px" }}>
        <div>
          <h1 className="title">User journey</h1>
          <p className="subtitle mono">{shortId(sessionId, 16)}</p>
        </div>
        <div className="row">
          <span className="pill">{views} page views</span>
          <span className="pill">{clicks} clicks</span>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <span className="muted">Couldn’t reach the API ({error}). Retrying…</span>
        </div>
      )}

      {events === null ? (
        <div className="empty">Loading journey…</div>
      ) : events.length === 0 ? (
        <div className="panel">
          <div className="empty">No events found for this session.</div>
        </div>
      ) : (
        <ul className="timeline">
          {events.map((e, i) => (
            <li key={e._id} className={`tl-item ${e.type}`}>
              <div className="tl-card">
                <div className="flex-between">
                  <div className="row">
                    <span className="small muted" style={{ width: 24 }}>
                      #{i + 1}
                    </span>
                    <span className={`badge ${e.type}`}>
                      {e.type === "click" ? "Click" : "Page view"}
                    </span>
                    <span className="mono small">{shortUrl(e.url)}</span>
                  </div>
                  <span className="small muted" title={fullTime(e.timestamp)}>
                    {clockTime(e.timestamp)}
                  </span>
                </div>
                {e.type === "click" && (
                  <div className="tl-meta">
                    coords ({e.pageX}, {e.pageY}) · viewport {e.viewportWidth}×
                    {e.viewportHeight} · page {e.pageWidth}×{e.pageHeight}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

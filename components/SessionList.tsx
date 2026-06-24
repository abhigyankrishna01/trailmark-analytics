"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SessionSummary } from "@/lib/types";
import { timeAgo, shortId, shortUrl } from "@/lib/format";

const REFRESH_MS = 6000;

export default function SessionList() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="title">Sessions</h1>
          <p className="subtitle">
            Every visitor session, most recent activity first.
          </p>
        </div>
        <span className="pill">
          <span className="live-dot" style={{ marginRight: 7 }} />
          Live · refreshes every {REFRESH_MS / 1000}s
        </span>
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <span className="muted">Couldn’t reach the API ({error}). Retrying…</span>
        </div>
      )}

      {sessions === null ? (
        <div className="empty">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <p style={{ fontSize: 16, marginBottom: 8 }}>No sessions yet.</p>
            <p className="small">
              Open the{" "}
              <a href="/demo.html" target="_blank" rel="noreferrer">
                demo store
              </a>{" "}
              and click around — sessions appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="panel" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Session</th>
                <th>Events</th>
                <th>First page</th>
                <th>First seen</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.sessionId}
                  className="clickable"
                  onClick={() =>
                    router.push(`/dashboard/sessions/${s.sessionId}`)
                  }
                >
                  <td className="mono">{shortId(s.sessionId)}</td>
                  <td>
                    <span className="pill">{s.eventCount}</span>
                  </td>
                  <td className="mono small">{shortUrl(s.firstUrl)}</td>
                  <td className="small muted">{timeAgo(s.firstSeen)}</td>
                  <td className="small">{timeAgo(s.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {updatedAt > 0 && (
        <p className="small muted" style={{ marginTop: 12 }}>
          Last updated {new Date(updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

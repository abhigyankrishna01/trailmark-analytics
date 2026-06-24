"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HeatmapClick, HeatmapResponse } from "@/lib/types";
import { shortUrl } from "@/lib/format";

// Build a 256-entry color ramp (cool -> warm) indexed by intensity 0..255.
function buildGradient(): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, "rgba(0,0,255,0)");
  grad.addColorStop(0.2, "rgba(0,120,255,0.65)");
  grad.addColorStop(0.45, "rgba(0,220,180,0.8)");
  grad.addColorStop(0.65, "rgba(180,255,60,0.85)");
  grad.addColorStop(0.82, "rgba(255,190,40,0.92)");
  grad.addColorStop(1.0, "rgba(255,40,40,1)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

const RADIUS = 34; // blob radius in px on the render canvas

function drawHeatmap(
  canvas: HTMLCanvasElement,
  clicks: HeatmapClick[],
  ramp: Uint8ClampedArray
) {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (clicks.length === 0) return;

  // 1) Paint grayscale alpha blobs; overlaps accumulate alpha => intensity.
  for (const c of clicks) {
    const xPct = c.pageX / c.pageWidth;
    const yPct = c.pageY / c.pageHeight;
    if (xPct < 0 || xPct > 1.2 || yPct < 0) continue;
    const x = xPct * w;
    const y = yPct * h;

    const g = ctx.createRadialGradient(x, y, 0, x, y, RADIUS);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2) Colorize: map accumulated alpha to the cool->warm ramp.
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const offset = alpha * 4;
    data[i] = ramp[offset];
    data[i + 1] = ramp[offset + 1];
    data[i + 2] = ramp[offset + 2];
    data[i + 3] = Math.min(255, alpha + 40);
  }
  ctx.putImageData(img, 0, 0);
}

export default function Heatmap() {
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [clicks, setClicks] = useState<HeatmapClick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rampRef = useRef<Uint8ClampedArray | null>(null);

  // Load the distinct URL list once.
  useEffect(() => {
    fetch("/api/heatmap", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: HeatmapResponse) => {
        setUrls(data.urls ?? []);
        if (data.urls && data.urls.length > 0 && !selected) {
          setSelected(data.urls[0]);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load clicks whenever the selected URL changes.
  const loadClicks = useCallback(async (url: string) => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap?url=${encodeURIComponent(url)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HeatmapResponse = await res.json();
      setClicks(data.clicks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clicks");
      setClicks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadClicks(selected);
  }, [selected, loadClicks]);

  // Derive an aspect ratio from the median page dimensions of the clicks,
  // so the container roughly matches the real page shape.
  const aspect = (() => {
    if (clicks.length === 0) return 1.4; // height/width fallback
    const ws = clicks.map((c) => c.pageWidth).sort((a, b) => a - b);
    const hs = clicks.map((c) => c.pageHeight).sort((a, b) => a - b);
    const mw = ws[Math.floor(ws.length / 2)] || 1280;
    const mh = hs[Math.floor(hs.length / 2)] || 1800;
    return Math.min(3, Math.max(0.4, mh / mw));
  })();

  // (Re)draw on data change or container resize.
  const render = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    if (!rampRef.current) rampRef.current = buildGradient();

    const cssW = wrap.clientWidth;
    const cssH = Math.round(cssW * aspect);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    drawHeatmap(canvas, clicks, rampRef.current);
  }, [clicks, aspect]);

  useEffect(() => {
    render();
    const ro = new ResizeObserver(render);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [render]);

  return (
    <div>
      <h1 className="title">Click heatmap</h1>
      <p className="subtitle">
        Clicks are positioned by their share of page size (pageX/pageWidth), so
        coordinates captured at any screen size land in the right relative spot.
      </p>

      <div className="row" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        <label className="small muted">Page:</label>
        <select
          className="select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={urls.length === 0}
        >
          {urls.length === 0 ? (
            <option>No pages with click data yet</option>
          ) : (
            urls.map((u) => (
              <option key={u} value={u}>
                {shortUrl(u)}
              </option>
            ))
          )}
        </select>
        <span className="pill">{clicks.length} clicks</span>
        {loading && <span className="small muted">loading…</span>}
      </div>

      {error && (
        <div className="panel" style={{ padding: 16, marginBottom: 16 }}>
          <span className="muted">Error: {error}</span>
        </div>
      )}

      {urls.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <p style={{ fontSize: 16, marginBottom: 8 }}>No click data yet.</p>
            <p className="small">
              Click around the{" "}
              <a href="/demo.html" target="_blank" rel="noreferrer">
                demo store
              </a>{" "}
              first, then come back.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={wrapRef}
            className="panel"
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 12px, transparent 12px 24px), var(--panel)",
            }}
          >
            <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
            {clicks.length === 0 && !loading && (
              <div
                className="empty"
                style={{ position: "absolute", inset: 0 }}
              >
                No clicks recorded on this page yet.
              </div>
            )}
          </div>
          <div className="row" style={{ marginTop: 14, gap: 16 }}>
            <span className="small muted">Intensity:</span>
            <div
              style={{
                height: 12,
                width: 220,
                borderRadius: 6,
                background:
                  "linear-gradient(90deg, rgba(0,120,255,0.7), rgba(0,220,180,0.8), rgba(180,255,60,0.85), rgba(255,190,40,0.9), rgba(255,40,40,1))",
              }}
            />
            <span className="small muted">low → high</span>
          </div>
        </>
      )}
    </div>
  );
}

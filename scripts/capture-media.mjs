/**
 * Captures README screenshots + a slideshow GIF of the live Trailmark app.
 * Dev-only tooling (not part of the app build, so its deps are not in
 * package.json to keep the Vercel build lean). To run:
 *   npm i -D playwright pngjs gif-encoder-2 && npx playwright install chromium
 *   node scripts/capture-media.mjs
 */
import { chromium } from "playwright";
import { PNG } from "pngjs";
import GIFEncoder from "gif-encoder-2";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.MEDIA_BASE || "https://trailmark-analytics.vercel.app";
const OUT = resolve(process.cwd(), "docs");
mkdirSync(OUT, { recursive: true });

async function firstSessionId(page) {
  const res = await page.request.get(`${BASE}/api/sessions`);
  const data = await res.json();
  return data.sessions?.[0]?.sessionId;
}

async function waitForHeatmap(page) {
  await page.waitForSelector("canvas", { timeout: 15000 });
  // canvas draws after the click fetch resolves; give it a beat
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await chromium.launch();

  // ---- Crisp static screenshots (1440x900, retina) ----
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  const sid = await firstSessionId(page);

  // Demo store
  await page.goto(`${BASE}/demo.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "demo.png") });

  // Dashboard sessions list
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForSelector("table tbody tr", { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(OUT, "dashboard.png") });

  // Session journey timeline
  if (sid) {
    await page.goto(`${BASE}/dashboard/sessions/${sid}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector(".tl-item", { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(OUT, "journey.png") });
  }

  // Heatmap (full page so the whole heat canvas is visible)
  await page.goto(`${BASE}/dashboard/heatmap`, { waitUntil: "networkidle" });
  await waitForHeatmap(page);
  await page.screenshot({ path: resolve(OUT, "heatmap.png"), fullPage: true });

  await ctx.close();

  // ---- GIF slideshow frames (uniform 1000x625) ----
  const W = 1000;
  const H = 625;
  const gctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const gp = await gctx.newPage();

  const frames = [];
  const grab = async () => frames.push(await gp.screenshot({ type: "png" }));

  await gp.goto(`${BASE}/demo.html`, { waitUntil: "networkidle" });
  await gp.waitForTimeout(500);
  await grab();

  await gp.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await gp.waitForSelector("table tbody tr", { timeout: 15000 });
  await gp.waitForTimeout(500);
  await grab();

  if (sid) {
    await gp.goto(`${BASE}/dashboard/sessions/${sid}`, {
      waitUntil: "networkidle",
    });
    await gp.waitForSelector(".tl-item", { timeout: 15000 });
    await gp.waitForTimeout(400);
    await grab();
  }

  await gp.goto(`${BASE}/dashboard/heatmap`, { waitUntil: "networkidle" });
  await waitForHeatmap(gp);
  await gp.waitForTimeout(200);
  await grab();

  await gctx.close();
  await browser.close();

  // ---- Encode GIF ----
  const enc = new GIFEncoder(W, H, "neuquant", true);
  enc.setDelay(1700);
  enc.setRepeat(0);
  enc.setQuality(10);
  enc.start();
  for (const buf of frames) {
    const png = PNG.sync.read(buf);
    enc.addFrame(png.data); // RGBA pixel buffer
  }
  enc.finish();
  writeFileSync(resolve(OUT, "demo.gif"), enc.out.getData());

  console.log(`Done. ${frames.length} GIF frames + 4 PNGs written to docs/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

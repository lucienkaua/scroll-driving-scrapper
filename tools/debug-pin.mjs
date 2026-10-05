/* Verifica ponta a ponta a captura/replay de pin no demo. */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_SRC = readFileSync(join(ROOT, "content/content.js"), "utf8");
const RUNTIME_SRC = readFileSync(join(ROOT, "runtime/scrollfx.runtime.js"), "utf8");
const URLD = "file:///" + join(ROOT, "demo/demo.html").replace(/\\/g, "/");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(URLD, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await page.evaluate(CONTENT_SRC);
const res = await page.evaluate("SFXCapture.startSample({ duration: 4000 })");
const pinTrack = res.tracks.find((t) => t.sel.includes("pin"));
console.log("=== TRACK DO PIN (seletor: " + (pinTrack && pinTrack.sel) + ") ===");
for (const k of (pinTrack ? pinTrack.keys : [])) console.log(`p=${k.p}  pin="${k.s.pin}"`);

const rp = await ctx.newPage();
await rp.route("**/*", (r) => r.request().resourceType() === "script" ? r.abort() : r.continue());
await rp.goto(URLD, { waitUntil: "domcontentloaded" });
await rp.addStyleTag({ content: "*{animation:none!important;transition:none!important;scroll-behavior:auto!important}" });
await rp.evaluate(RUNTIME_SRC);
await rp.evaluate((tr) => { window.__sfx = window.SFX.init(tr, { respectReducedMotion: false }); }, res.tracks);
console.log("\n=== REPLAY (scripts bloqueados): position/top/transform do #pin-card ===");
for (const p of [0.1, 0.3, 0.6]) {
  const out = await rp.evaluate(async (f) => {
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo(0, f * total);
    window.__sfx.update();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cs = getComputedStyle(document.getElementById("pin-card"));
    return { position: cs.position, top: cs.top, transform: cs.transform.slice(0, 60) };
  }, p);
  console.log(`p=${p}:`, JSON.stringify(out));
}
await browser.close();

/* Depuração: imprime keys capturadas, truth e replay por posição para o demo. */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_SRC = readFileSync(join(ROOT, "content/content.js"), "utf8");
const RUNTIME_SRC = readFileSync(join(ROOT, "runtime/scrollfx.runtime.js"), "utf8");
const URLD = "file:///" + join(ROOT, "demo/demo.html").replace(/\\/g, "/");
const POSITIONS = [0.15, 0.35, 0.55, 0.75, 0.9];

const PAGE_HELPERS = `window.__VH = (() => {
  const parseT = (t) => { if (!t || t === "none") return [1,0,0,1,0,0];
    const m = /matrix\\(([^)]+)\\)/.exec(t); return m ? m[1].split(",").map(parseFloat) : [1,0,0,1,0,0]; };
  const snap = (el) => { const cs = getComputedStyle(el); return {
    transform: parseT(cs.transform), opacity: parseFloat(cs.opacity) }; };
  return { snap };
})();`;

const fmt = (s) => s ? `t=[${s.transform.map((n) => +n.toFixed(2)).join(",")}] o=${s.opacity}` : "null";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(URLD, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.evaluate(CONTENT_SRC);
const res = await page.evaluate("SFXCapture.startSample({ duration: 4000 })");

console.log("=== KEYS CAPTURADAS ===");
for (const t of res.tracks) {
  console.log(`sel: ${t.sel}`);
  for (const k of t.keys)
    console.log(`  p=${k.p}  t=[${(k.s.transform || []).map((n) => +n.toFixed(2)).join(",")}] o=${k.s.opacity}`);
}

const sels = res.tracks.map((t) => t.sel);
await page.evaluate(PAGE_HELPERS);
console.log("\n=== TRUTH (site vivo, parado em cada posição) ===");
for (const p of POSITIONS) {
  await page.evaluate(async (f) => {
    document.documentElement.style.scrollBehavior = "auto";
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo(0, f * total);
    await new Promise((r) => setTimeout(r, 700));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, p);
  const snaps = await page.evaluate((ss) => ss.map((sel) => {
    const el = document.querySelector(sel); return el ? window.__VH.snap(el) : null;
  }), sels);
  console.log(`p=${p}: ` + snaps.map((s, i) => `[${i}] ${fmt(s)}`).join("  |  "));
}

const rp = await ctx.newPage();
await rp.route("**/*", (r) => r.request().resourceType() === "script" ? r.abort() : r.continue());
await rp.goto(URLD, { waitUntil: "domcontentloaded" });
await rp.addStyleTag({ content: "*{animation:none!important;transition:none!important;scroll-behavior:auto!important}" });
await rp.waitForTimeout(800);
await rp.evaluate(PAGE_HELPERS);
await rp.evaluate(RUNTIME_SRC);
const count = await rp.evaluate((tr) => { window.__sfx = window.SFX.init(tr, { respectReducedMotion: false }); return window.__sfx.count(); }, res.tracks);
console.log(`\n=== REPLAY (scripts bloqueados, anims off) count=${count} ===`);
for (const p of POSITIONS) {
  await rp.evaluate(async (f) => {
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo(0, f * total);
    window.__sfx.update();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, p);
  const snaps = await rp.evaluate((ss) => ss.map((sel) => {
    const el = document.querySelector(sel); return el ? window.__VH.snap(el) : null;
  }), sels);
  console.log(`p=${p}: ` + snaps.map((s, i) => `[${i}] ${fmt(s)}`).join("  |  "));
}
await browser.close();

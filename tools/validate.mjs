/* Harness de validação do SFX Clone.
 * Para cada site: injeta o capturador no site vivo, grava as tracks, tira
 * snapshots de verdade-terreno em 5 posições de scroll, depois recarrega a
 * página com scripts bloqueados + CSS animations desligadas, injeta só o
 * runtime + tracks e compara estilo a estilo.
 *
 * Uso: node tools/validate.mjs [urls...]   (sem args usa a lista padrão)
 */
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_SRC = readFileSync(join(ROOT, "content/content.js"), "utf8");
const RUNTIME_SRC = readFileSync(join(ROOT, "runtime/scrollfx.runtime.js"), "utf8");

const DEFAULT_SITES = [
  { name: "scroll-driven-animations.style", url: "https://scroll-driven-animations.style/" },
  { name: "lenis.darkroom.engineering", url: "https://lenis.darkroom.engineering/" },
  { name: "gsap.com", url: "https://gsap.com/" },
];
const SITES = process.argv.slice(2).length
  ? process.argv.slice(2).map((u) => ({ name: new URL(u).hostname, url: u }))
  : DEFAULT_SITES;

const POSITIONS = [0.15, 0.35, 0.55, 0.75, 0.9];
const RECORD_MS = 6000;

/* snap + dist no lado da página (mesma semântica do capturador) */
const PAGE_HELPERS = `window.__VH = (() => {
  const parseT = (t) => { if (!t || t === "none") return [1,0,0,1,0,0];
    const m = /matrix\\(([^)]+)\\)/.exec(t); return m ? m[1].split(",").map(parseFloat) : [1,0,0,1,0,0]; };
  const snap = (el) => { const cs = getComputedStyle(el); return {
    transform: parseT(cs.transform), opacity: parseFloat(cs.opacity),
    filter: cs.filter, clipPath: cs.clipPath, backgroundPosition: cs.backgroundPosition }; };
  return { snap };
})();`;

function tokenize(str) {
  if (str == null) return [];
  return String(str).match(/-?\d*\.?\d+(?:e-?\d+)?|\s|[^ \d.]/gi) || [];
}
function styleDist(a, b) {
  if (!a || !b) return null;
  let d = 0;
  for (let i = 0; i < 6; i++) d += Math.abs((a.transform?.[i] ?? 0) - (b.transform?.[i] ?? 0));
  d += Math.abs((a.opacity ?? 1) - (b.opacity ?? 1)) * 10;
  for (const p of ["filter", "clipPath", "backgroundPosition"]) {
    const A = tokenize(a[p]), B = tokenize(b[p]);
    if (A.length !== B.length) { d += 2; continue; }
    for (let j = 0; j < A.length; j++) {
      const na = parseFloat(A[j]), nb = parseFloat(B[j]);
      if (!isNaN(na) && !isNaN(nb)) d += Math.abs(na - nb);
      else if (A[j] !== B[j]) d += 1;
    }
  }
  return d;
}
const clamp10 = (v) => Math.max(0, Math.min(10, v));

async function acceptCookies(page) {
  const labels = ["Accept", "Accept all", "Aceitar", "I agree", "Got it", "OK", "Allow all"];
  for (const l of labels) {
    try {
      const b = page.getByRole("button", { name: l, exact: false }).first();
      if (await b.isVisible({ timeout: 400 })) { await b.click({ timeout: 800 }); break; }
    } catch {}
  }
}
async function settleScroll(page, frac) {
  await page.evaluate(async (f) => {
    document.documentElement.style.scrollBehavior = "auto";
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo(0, f * total);
    await new Promise((r) => setTimeout(r, 900));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, frac);
}
async function snapSelectors(page, sels) {
  return page.evaluate((ss) => ss.map((sel) => {
    try { const el = document.querySelector(sel); return el ? window.__VH.snap(el) : null; }
    catch { return null; }
  }), sels);
}

async function testSite(browser, site) {
  const out = { site: site.name, url: site.url };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await acceptCookies(page);

    await page.evaluate(CONTENT_SRC);
    out.stack = await page.evaluate("SFXCapture.detectStack()");
    const nativeCss = await page.evaluate("SFXCapture.extractNative()");
    out.nativeCssBytes = nativeCss.trim().length;

    const t0 = Date.now();
    const res = await page.evaluate(`SFXCapture.startSample({ duration: ${RECORD_MS} })`);
    out.captureMs = Date.now() - t0;
    out.scanned = res.scanned; out.animated = res.animated;
    const tracks = res.tracks;
    out.targets = tracks.length;
    out.totalKeys = tracks.reduce((n, t) => n + t.keys.length, 0);
    out.bundleKb = +((RUNTIME_SRC.length + JSON.stringify(tracks).length) / 1024).toFixed(1);

    const sels = tracks.map((t) => t.sel);

    // verdade-terreno: site vivo parado em cada posição
    await page.evaluate(PAGE_HELPERS);
    const truth = [];
    for (const p of POSITIONS) { await settleScroll(page, p); truth.push(await snapSelectors(page, sels)); }

    // robustez de seletores após reload
    await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const selStats = await page.evaluate((ss) => {
      let unique = 0, found = 0;
      ss.forEach((sel) => {
        try { const n = document.querySelectorAll(sel).length; if (n === 1) unique++; if (n >= 1) found++; } catch {}
      });
      return { unique, found, total: ss.length };
    }, sels);
    out.selectors = selStats;

    // replay: mesma URL com scripts bloqueados + CSS anims off + runtime injetado
    const rp = await ctx.newPage();
    await rp.route("**/*", (route) =>
      route.request().resourceType() === "script" ? route.abort() : route.continue());
    await rp.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await rp.addStyleTag({ content: "*{animation:none!important;transition:none!important;scroll-behavior:auto!important}" });
    await rp.waitForTimeout(1500);
    await rp.evaluate(PAGE_HELPERS);
    await rp.evaluate(RUNTIME_SRC);
    await rp.evaluate((tr) => { window.__sfx = window.SFX.init(tr, { respectReducedMotion: false }); }, tracks);
    out.replayCount = await rp.evaluate("window.__sfx.count()");
    const replay = [];
    for (const p of POSITIONS) {
      await rp.evaluate(async (f) => {
        const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
        window.scrollTo(0, f * total);
        window.__sfx.update();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, p);
      replay.push(await snapSelectors(rp, sels));
    }
    await rp.close();

    // fidelidade: erro médio relativo à amplitude da animação de cada elemento
    const fid = [];
    for (let i = 0; i < sels.length; i++) {
      let span = 0;
      for (let a = 0; a < POSITIONS.length; a++)
        for (let b = a + 1; b < POSITIONS.length; b++) {
          const d = styleDist(truth[a][i], truth[b][i]);
          if (d != null) span = Math.max(span, d);
        }
      if (span < 0.5) continue; // não animou no trecho medido — fora da conta
      let sum = 0, n = 0;
      for (let p = 0; p < POSITIONS.length; p++) {
        const d = styleDist(truth[p][i], replay[p][i]);
        if (d != null) { sum += d; n++; }
      }
      if (n) fid.push(Math.max(0, 1 - (sum / n) / (span + 1e-6)));
    }
    out.fidelityElements = fid.length;
    out.fidelity = fid.length ? +(fid.reduce((a, b) => a + b, 0) / fid.length).toFixed(3) : null;

    // ---- notas ----
    const retention = out.animated ? out.targets / Math.min(out.animated, 300) : 0;
    const scores = {
      fidelidade: out.fidelity == null ? 0 : clamp10(10 * out.fidelity),
      cobertura: out.targets ? clamp10(10 * (0.5 * Math.min(out.targets / 15, 1) + 0.5 * retention)) : 0,
      seletores: selStats.total ? clamp10(10 * ((selStats.unique + 0.5 * (selStats.found - selStats.unique)) / selStats.total)) : 0,
      bundle: clamp10(10 * (500 - out.bundleKb) / 440),
      performance: clamp10(10 * (45000 - out.captureMs) / 30000),
    };
    for (const k of Object.keys(scores)) scores[k] = +scores[k].toFixed(1);
    out.scores = scores;
    out.nota = +(scores.fidelidade * 0.35 + scores.cobertura * 0.25 + scores.seletores * 0.2
      + scores.bundle * 0.1 + scores.performance * 0.1).toFixed(1);
  } catch (e) {
    out.error = String(e).slice(0, 400);
  } finally {
    await ctx.close();
  }
  return out;
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
for (const site of SITES) {
  console.log(`\n=== ${site.name} ===`);
  const r = await testSite(browser, site);
  console.log(JSON.stringify(r, null, 2));
  results.push(r);
}
await browser.close();
mkdirSync(join(ROOT, "tools/out"), { recursive: true });
writeFileSync(join(ROOT, "tools/out/results.json"), JSON.stringify(results, null, 2));
console.log("\nResultados em tools/out/results.json");

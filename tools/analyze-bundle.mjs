/* Analisa bundles gerados pela extensão: higiene, seletores (inclusive ao vivo
 * contra o site de origem), pin e tamanho.
 * Uso: node tools/analyze-bundle.mjs <bundle1.js> [bundle2.js ...]
 */
import { chromium } from "playwright-core";
import { readFileSync, statSync } from "fs";

const HASH_RX = /module__|[0-9a-f]{8,}|(^|[^a-z0-9])(css|sc|svelte|jss)-[a-z0-9]{4,}/i;
const JUNK_RX = /^html($| )|> (head|meta|script|title|link|style)(:|$| )/;

function parseBundle(path) {
  const txt = readFileSync(path, "utf8");
  const head = /\/\* SFX bundle - (.*?) - ([0-9T:.Z-]+) \*\//.exec(txt);
  const ver = /SFX\.version = "([^"]+)"/.exec(txt);
  const tm = /window\.__SFX_TRACKS__ = (\[.*?\]);\n/s.exec(txt);
  const tracks = tm ? JSON.parse(tm[1]) : [];
  const keys = tracks.reduce((n, t) => n + t.keys.length, 0);
  return {
    path, url: head ? head[1] : "?", capturedAt: head ? head[2] : "?",
    runtime: ver ? ver[1] : "?",
    kb: +(statSync(path).size / 1024).toFixed(1),
    tracks: tracks.length, keys,
    singleKey: tracks.filter((t) => t.keys.length < 2).length,
    junk: tracks.filter((t) => JUNK_RX.test(t.sel)).length,
    hashed: tracks.filter((t) => HASH_RX.test(t.sel)).map((t) => t.sel),
    pinTracks: tracks.filter((t) => t.keys.some((k) => k.s.pin && k.s.pin !== "none")).length,
    sels: tracks.map((t) => t.sel),
  };
}

const bundles = process.argv.slice(2).map(parseBundle);
const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const b of bundles) {
  const out = { ...b };
  delete out.sels;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(b.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    const live = await page.evaluate((ss) => {
      let unique = 0, found = 0;
      ss.forEach((sel) => {
        try { const n = document.querySelectorAll(sel).length; if (n === 1) unique++; if (n >= 1) found++; } catch {}
      });
      return { unique, found, total: ss.length };
    }, b.sels);
    out.seletoresAoVivo = `${live.unique}/${live.total} únicos, ${live.found}/${live.total} resolvem`;
    await page.close();
  } catch (e) { out.seletoresAoVivo = "erro: " + String(e).slice(0, 80); }
  console.log(JSON.stringify(out, null, 2));
}
await browser.close();

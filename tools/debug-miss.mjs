/* Identifica seletores que nao resolvem e testa em dois viewports. */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";

const path = process.argv[2];
const txt = readFileSync(path, "utf8");
const url = /\/\* SFX bundle - (.*?) - /.exec(txt)[1];
const tracks = JSON.parse(/window\.__SFX_TRACKS__ = (\[.*?\]);\n/s.exec(txt)[1]);
const sels = tracks.map((t) => t.sel);

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const vp of [{ width: 1280, height: 900 }, { width: 1920, height: 1080 }]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);
  const miss = await page.evaluate((ss) => ss.filter((sel) => {
    try { return document.querySelectorAll(sel).length !== 1; } catch { return true; }
  }), sels);
  console.log(`${vp.width}x${vp.height}: ${sels.length - miss.length}/${sels.length} ok` +
    (miss.length ? ` | falham: ${JSON.stringify(miss)}` : ""));
  await page.close();
}
await browser.close();

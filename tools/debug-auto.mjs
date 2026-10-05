/* Verifica a duração Auto: demo (página curta -> piso 8s) e página alta sintética. */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_SRC = readFileSync(join(ROOT, "content/content.js"), "utf8");
const URLD = "file:///" + join(ROOT, "demo/demo.html").replace(/\\/g, "/");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URLD, { waitUntil: "domcontentloaded" });
await page.evaluate(CONTENT_SRC);
let t0 = Date.now();
let res = await page.evaluate('SFXCapture.startSample({ duration: "auto" })');
console.log(`demo (${await page.evaluate("document.documentElement.scrollHeight")}px): auto levou ${((Date.now() - t0) / 1000).toFixed(1)}s, ${res.tracks.length} tracks`);

await page.evaluate(() => { document.body.insertAdjacentHTML("beforeend", '<div style="height:30000px"></div>'); });
await page.evaluate(() => { delete globalThis.__SFX_CS__; });
await page.evaluate(CONTENT_SRC);
t0 = Date.now();
res = await page.evaluate('SFXCapture.startSample({ duration: "auto" })');
console.log(`demo+30000px (${await page.evaluate("document.documentElement.scrollHeight")}px): auto levou ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await browser.close();

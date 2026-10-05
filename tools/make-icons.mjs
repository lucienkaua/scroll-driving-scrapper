/* Rasteriza icons/icon.svg em PNGs 16/48/128 (fundo transparente fora do rx). */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = readFileSync(join(ROOT, "icons/icon.svg"), "utf8");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [16, 48, 128]) {
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>
    <div id="i" style="width:${size}px;height:${size}px">${SVG}</div>`);
  await page.locator("#i").screenshot({ path: join(ROOT, `icons/icon${size}.png`), omitBackground: true });
  console.log(`icons/icon${size}.png ok`);
}
await browser.close();

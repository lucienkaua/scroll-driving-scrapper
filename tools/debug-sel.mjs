/* Testa buildSelector contra classes hasheadas de bundlers reais. */
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_SRC = readFileSync(join(ROOT, "content/content.js"), "utf8");

const HTML = `<!doctype html><html class="anton_a8b17dcd-module__Xi7J6a__variable roboto_2384e6da-module__e7HsQW__variable"><body>
  <div id="app">
    <div class="anton_a8b17dcd-module__Xi7J6a__variable hero-wrapper">
      <p class="css-1q2w8e intro-text">emotion</p>
      <p class="styles_title__3kDpL headline">css-modules</p>
      <span class="sc-bdVaJa cta-button">styled-components</span>
      <span class="svelte-1abc2de badge">svelte</span>
      <em class="dr-py-30 desktop-only">tokens estaveis</em>
      <i class="x1n2onr6 x9f619">facebook-style</i>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
await page.setContent(HTML);
await page.evaluate(CONTENT_SRC);
const out = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("#app *")).map((el) => {
    const sel = window.SFXCapture.buildSelector(el);
    return { sel, unico: document.querySelectorAll(sel).length === 1 };
  });
});
for (const o of out) console.log((o.unico ? "OK  " : "DUP ") + o.sel);
const dirty = out.filter((o) => /module|css-1|sc-bdVaJa|svelte-1|[0-9a-f]{8}/.test(o.sel));
console.log(dirty.length ? "\nFALHOU: seletores com hash: " + dirty.length : "\nNenhum hash nos seletores.");
await browser.close();

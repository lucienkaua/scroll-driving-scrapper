/* Reproduz o pre-scan manualmente só para o .p-hero: transform computado em cada parada. */
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URLD = "file:///" + join(ROOT, "demo/demo.html").replace(/\\/g, "/");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URLD, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const probe = await page.evaluate(async () => {
  const el = document.querySelector(".p-hero");
  const sup = {
    view: CSS.supports("animation-timeline: view()"),
    timelineComputed: getComputedStyle(el).animationTimeline,
  };
  const out = [];
  document.documentElement.style.scrollBehavior = "auto";
  for (let s = 0; s <= 13; s++) {
    const total = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo(0, (s / 13) * total);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() =>
      requestAnimationFrame(() => requestAnimationFrame(r)))));
    out.push({ stop: s, y: Math.round(scrollY), t: getComputedStyle(el).transform });
  }
  return { sup, out };
});
console.log(JSON.stringify(probe, null, 2));
await browser.close();

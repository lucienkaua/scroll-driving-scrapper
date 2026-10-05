/* Screenshots do popup (estado inicial e pós-captura simulado) para verificação visual. */
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URLP = "file:///" + join(ROOT, "popup/popup.html").replace(/\\/g, "/");

const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 380, height: 620 } });
await p.goto(URLP);
await p.waitForTimeout(500);
await p.screenshot({ path: join(ROOT, "tools/out/popup-v12-idle.png") });

await p.evaluate(() => {
  document.getElementById("stack").innerHTML = ["GSAP", "SCROLLTRIGGER", "LENIS", "CANVAS/WEBGL"]
    .map((s, i) => `<span style="--i:${i}">${s}</span>`).join("");
  const tracks = Array.from({ length: 12 }, (_, i) => ({
    keys: Array.from({ length: 8 }, (_, k) => ({ p: (i * 0.08 + k * 0.012) % 1 })),
  }));
  const ruler = document.getElementById("ruler").getContext("2d");
  const RW = 312, RH = 34;
  const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
  ruler.clearRect(0, 0, RW, RH);
  ruler.strokeStyle = css("--line");
  ruler.beginPath();
  for (let i = 0; i <= 10; i++) {
    const x = Math.round((i / 10) * (RW - 8)) + 4, h = i % 5 === 0 ? 7 : 4;
    ruler.moveTo(x, RH - 5 - h); ruler.lineTo(x, RH - 5);
  }
  ruler.stroke();
  ruler.fillStyle = css("--rec");
  ruler.globalAlpha = 0.3;
  tracks.forEach((t) => t.keys.forEach((k) => ruler.fillRect(4 + (RW - 8) * k.p, 7, 1.5, 16)));
  ruler.globalAlpha = 1;
  document.getElementById("rulerLabel").textContent = "keyframes";
  document.getElementById("status").innerHTML = "<b>23 alvos</b>, 480 keyframes (de 25 elementos que mudam). Copie ou baixe o .js.";
  document.getElementById("out").value = "/* SFX bundle - https://lenis.darkroom.engineering/ - 2026-10-05 */\n(function (global) { /* runtime */ })(window);\nwindow.__SFX_TRACKS__ = [/* 23 tracks */];";
  document.getElementById("size").textContent = "65.8 KB";
});
await p.waitForTimeout(600);
await p.screenshot({ path: join(ROOT, "tools/out/popup-v12-done.png") });
await b.close();
console.log("ok");

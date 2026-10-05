/* Compoe os screenshots 1280x800 da Chrome Web Store com o popup real. */
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "store/screenshots"), { recursive: true });
const b64 = (p) => "data:image/png;base64," + readFileSync(join(ROOT, p)).toString("base64");

const BASE_CSS = `
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1280px; height: 800px; overflow: hidden;
    background: radial-gradient(90% 70% at 78% 30%, #2b1d42, transparent 60%),
                radial-gradient(60% 50% at 15% 85%, #3d1220, transparent 70%), #141019;
    color: #ede9e0; font-family: "Segoe UI", system-ui, sans-serif;
    display: flex; align-items: center; padding: 0 72px; gap: 56px;
  }
  .mono { font-family: "Cascadia Code", Consolas, monospace; }
  .copy { flex: 1; }
  .brand { display: flex; align-items: center; gap: 18px; margin-bottom: 34px; }
  .brand img { width: 84px; border-radius: 19px; box-shadow: 0 12px 40px rgba(124,58,237,.35); }
  .brand h1 { font-family: "Cascadia Code", Consolas, monospace; font-size: 34px; letter-spacing: .14em; }
  h2 { font-size: 46px; line-height: 1.18; font-weight: 650; margin-bottom: 22px; }
  h2 em { font-style: normal; background: linear-gradient(90deg, #7c3aed, #f5483e); -webkit-background-clip: text; background-clip: text; color: transparent; }
  p.sub { font-size: 20px; line-height: 1.55; color: #9a947f; max-width: 540px; }
  .popup { flex: none; }
  .popup img { width: 400px; border-radius: 14px; border: 1px solid #35322b; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
  ul.steps { list-style: none; margin-top: 30px; font-size: 19px; }
  ul.steps li { display: flex; gap: 14px; align-items: baseline; margin-bottom: 16px; color: #cfc9bc; }
  ul.steps b { font-family: "Cascadia Code", Consolas, monospace; color: #f5483e; }
`;

const PAGES = [
  {
    out: "store/screenshots/01-hero.png",
    html: `
      <div class="copy">
        <div class="brand"><img src="${b64("icons/icon128.png")}"><h1>SFX CLONE</h1></div>
        <h2>Clone as <em>animações de scroll</em> de qualquer site num .js plug-and-play</h2>
        <p class="sub">Capture parallax, reveals, pins e scrubs do seu site de referência e cole no seu projeto — runtime de 4 KB, sem dependências.</p>
      </div>
      <div class="popup"><img src="${b64("tools/out/popup-v12-done.png")}"></div>`,
  },
  {
    out: "store/screenshots/02-fluxo.png",
    html: `
      <div class="copy">
        <div class="brand"><img src="${b64("icons/icon128.png")}"><h1>SFX CLONE</h1></div>
        <h2>Capturar → Colar → <em>Rolar</em></h2>
        <ul class="steps">
          <li><b>01</b> A varredura acha o que anima e grava os keyframes pelo progresso do scroll</li>
          <li><b>02</b> O bundle sai auto-contido, com seletores que sobrevivem a novos deploys</li>
          <li><b>03</b> Nenhum dado coletado — nada roda até você clicar</li>
        </ul>
      </div>
      <div class="popup"><img src="${b64("tools/out/popup-v12-idle.png")}"></div>`,
  },
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
for (const p of PAGES) {
  await page.setContent(`<style>${BASE_CSS}</style>${p.html}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(ROOT, p.out) });
  console.log(p.out + " ok");
}
await browser.close();

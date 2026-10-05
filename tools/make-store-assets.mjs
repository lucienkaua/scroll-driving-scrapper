/* Compoe os assets da Chrome Web Store (JPEG sem alfa, como o formulario exige):
 * screenshots 1280x800, bloco promocional 440x280 e letreiro 1400x560. */
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "store/screenshots"), { recursive: true });
const b64 = (p) => "data:image/png;base64," + readFileSync(join(ROOT, p)).toString("base64");

const css = (w, h, extra = "") => `
  * { margin: 0; box-sizing: border-box; }
  body {
    width: ${w}px; height: ${h}px; overflow: hidden;
    background: radial-gradient(90% 70% at 78% 30%, #2b1d42, transparent 60%),
                radial-gradient(60% 50% at 15% 85%, #3d1220, transparent 70%), #141019;
    color: #ede9e0; font-family: "Segoe UI", system-ui, sans-serif;
  }
  .mono { font-family: "Cascadia Code", Consolas, monospace; }
  .grad { background: linear-gradient(90deg, #7c3aed, #f5483e); -webkit-background-clip: text; background-clip: text; color: transparent; }
  ${extra}
`;

const LAYOUT_WIDE = `
  body { display: flex; align-items: center; padding: 0 72px; gap: 56px; }
  .copy { flex: 1; }
  .brand { display: flex; align-items: center; gap: 18px; margin-bottom: 34px; }
  .brand img { width: 84px; border-radius: 19px; box-shadow: 0 12px 40px rgba(124,58,237,.35); }
  .brand h1 { font-family: "Cascadia Code", Consolas, monospace; font-size: 34px; letter-spacing: .14em; }
  h2 { font-size: 46px; line-height: 1.18; font-weight: 650; margin-bottom: 22px; }
  h2 em { font-style: normal; background: linear-gradient(90deg, #7c3aed, #f5483e); -webkit-background-clip: text; background-clip: text; color: transparent; }
  p.sub { font-size: 20px; line-height: 1.55; color: #9a947f; max-width: 540px; }
  .popup { flex: none; }
  .popup img { border-radius: 14px; border: 1px solid #35322b; box-shadow: 0 30px 80px rgba(0,0,0,.6); }
  ul.steps { list-style: none; margin-top: 30px; font-size: 19px; }
  ul.steps li { display: flex; gap: 14px; align-items: baseline; margin-bottom: 16px; color: #cfc9bc; }
  ul.steps b { font-family: "Cascadia Code", Consolas, monospace; color: #f5483e; }
`;

const ASSETS = [
  {
    out: "store/screenshots/01-hero.jpg", w: 1280, h: 800, extra: LAYOUT_WIDE,
    html: `
      <div class="copy">
        <div class="brand"><img src="${b64("icons/icon128.png")}"><h1>SFX CLONE</h1></div>
        <h2>Clone as <em>animações de scroll</em> de qualquer site num .js plug-and-play</h2>
        <p class="sub">Capture parallax, reveals, pins e scrubs do seu site de referência e cole no seu projeto — runtime de 4 KB, sem dependências.</p>
      </div>
      <div class="popup"><img style="width:400px" src="${b64("tools/out/popup-v12-done.png")}"></div>`,
  },
  {
    out: "store/screenshots/02-fluxo.jpg", w: 1280, h: 800, extra: LAYOUT_WIDE,
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
      <div class="popup"><img style="width:400px" src="${b64("tools/out/popup-v12-idle.png")}"></div>`,
  },
  {
    out: "store/promo-small-440x280.jpg", w: 440, h: 280,
    extra: `
      body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; }
      img.icon { width: 88px; border-radius: 20px; box-shadow: 0 10px 34px rgba(124,58,237,.4); }
      h1 { font-family: "Cascadia Code", Consolas, monospace; font-size: 26px; letter-spacing: .16em; }
      p { font-size: 14px; color: #9a947f; max-width: 340px; line-height: 1.45; }`,
    html: `
      <img class="icon" src="${b64("icons/icon128.png")}">
      <h1>SFX <span class="grad">CLONE</span></h1>
      <p>Clone as animações de scroll de qualquer site em um .js plug-and-play</p>`,
  },
  {
    out: "store/promo-marquee-1400x560.jpg", w: 1400, h: 560,
    extra: `
      body { display: flex; align-items: center; padding: 0 90px; gap: 70px; }
      .copy { flex: 1; }
      .brand { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; }
      .brand img { width: 72px; border-radius: 16px; box-shadow: 0 10px 34px rgba(124,58,237,.4); }
      .brand h1 { font-family: "Cascadia Code", Consolas, monospace; font-size: 28px; letter-spacing: .15em; }
      h2 { font-size: 44px; line-height: 1.2; font-weight: 650; margin-bottom: 16px; }
      p.sub { font-size: 19px; color: #9a947f; max-width: 620px; line-height: 1.5; }
      .popup img { width: 310px; border-radius: 13px; border: 1px solid #35322b; box-shadow: 0 26px 70px rgba(0,0,0,.6); }`,
    html: `
      <div class="copy">
        <div class="brand"><img src="${b64("icons/icon128.png")}"><h1>SFX CLONE</h1></div>
        <h2>Clone as <span class="grad">animações de scroll</span> de qualquer site</h2>
        <p class="sub">Parallax, reveals, pins e scrubs exportados num .js auto-contido de 4 KB — sem dependências, sem coleta de dados.</p>
      </div>
      <div class="popup"><img src="${b64("tools/out/popup-v12-done.png")}"></div>`,
  },
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
for (const a of ASSETS) {
  await page.setViewportSize({ width: a.w, height: a.h });
  await page.setContent(`<style>${css(a.w, a.h, a.extra || "")}</style>${a.html}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(ROOT, a.out), type: "jpeg", quality: 92 });
  console.log(a.out + " ok");
}
await browser.close();

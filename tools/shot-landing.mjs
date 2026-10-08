/* Screenshots da landing de exemplo em 3 pontos + captura de erros de console. */
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL = "file:///" + join(ROOT, "examples/landing-produtividade.html").replace(/\\/g, "/");

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
page.on("pageerror", (e) => erros.push(String(e)));
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: join(ROOT, "tools/out/landing-hero.png") });
await page.evaluate(() => document.getElementById("cases").scrollIntoView());
await page.waitForTimeout(900);
await page.screenshot({ path: join(ROOT, "tools/out/landing-cases.png") });
await page.evaluate(() => document.getElementById("abrir-frente").scrollIntoView({ block: "center" }));
await page.waitForTimeout(900);
await page.screenshot({ path: join(ROOT, "tools/out/landing-cta.png") });
console.log(erros.length ? "ERROS: " + JSON.stringify(erros) : "console limpo");
await browser.close();

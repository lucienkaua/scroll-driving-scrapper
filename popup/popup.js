"use strict";
const $ = (id) => document.getElementById(id);
const EXT = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
let bundleSrc = "";
let busy = false;

/* ---- régua de keyframes (canvas): progresso durante a captura, densidade depois ---- */
const ruler = $("ruler").getContext("2d");
const RW = $("ruler").width, RH = $("ruler").height;
const css = (v) => getComputedStyle(document.body).getPropertyValue(v).trim();
function rulerBase() {
  ruler.clearRect(0, 0, RW, RH);
  ruler.strokeStyle = css("--line");
  ruler.beginPath();
  for (let i = 0; i <= 10; i++) {
    const x = Math.round((i / 10) * (RW - 8)) + 4;
    const h = i % 5 === 0 ? 7 : 4;
    ruler.moveTo(x, RH - 5 - h); ruler.lineTo(x, RH - 5);
  }
  ruler.stroke();
}
function rulerLabel(text, rec) {
  $("rulerLabel").textContent = text;
  $("rulerLabel").classList.toggle("rec", !!rec);
}
function rulerProgress(p, phase) {
  rulerBase();
  const w = (RW - 8) * (p / 100);
  ruler.fillStyle = phase === "scan" ? css("--line-2") : css("--rec");
  ruler.fillRect(4, 11, w, 6);
  ruler.fillStyle = css("--ink"); // cabeca da varredura
  ruler.fillRect(3 + w, 7, 2, 14);
  rulerLabel(phase === "scan" ? "varredura" : "rec ●", phase !== "scan");
}
function rulerKeys(tracks) {
  rulerBase();
  ruler.fillStyle = css("--rec");
  ruler.globalAlpha = 0.3;
  tracks.forEach((t) => t.keys.forEach((k) => {
    ruler.fillRect(4 + (RW - 8) * k.p, 7, 1.5, 16);
  }));
  ruler.globalAlpha = 1;
  rulerLabel("keyframes", false);
}
rulerBase();
rulerLabel("timeline", false);

const status = (html) => { $("status").innerHTML = html; };
const kb = (s) => (new Blob([s]).size / 1024).toFixed(1) + " KB";
function setBusy(b) {
  busy = b;
  $("sample").disabled = b; $("css").disabled = b; $("dur").disabled = b;
  $("sample").classList.toggle("busy", b);
  $("sampleLabel").textContent = b ? "Gravando…" : "Capturar rolagem";
  $("dot").classList.toggle("live", b);
}
function setOutput(src, sized) {
  bundleSrc = src;
  $("out").value = src;
  $("size").textContent = sized && src ? kb(src) : "";
}

if (EXT) chrome.runtime.onMessage.addListener((m) => {
  if (m && m.type === "sfx-progress" && busy) {
    rulerProgress(m.p, m.phase);
    status(m.phase === "scan" ? "Varrendo a página em busca de elementos animados…"
                              : "<b>Gravando.</b> Não mexa na página alvo.");
  }
});

async function activeTabId() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t && t.id;
}
/* injeta o capturador na hora do clique (activeTab) - sempre na versão atual,
   sem depender de F5 na aba nem de content script declarativo */
async function ensureCapture(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content/content.js"] });
    return null;
  } catch (e) {
    return "Sem acesso a esta página — páginas internas do navegador e a Web Store não permitem captura.";
  }
}
function send(tab, msg) {
  return new Promise((res) => chrome.tabs.sendMessage(tab, msg, (r) =>
    res(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : r)));
}
async function runtimeSrc() {
  return (await fetch(chrome.runtime.getURL("runtime/scrollfx.runtime.js"))).text();
}
function buildBundle(tracks, src, meta) {
  return "/* SFX bundle" + (meta && meta.url ? " - " + meta.url : "") + " - " + new Date().toISOString() + " */\n"
    + src + "\n;\n"
    + "window.__SFX_TRACKS__ = " + JSON.stringify(tracks) + ";\n"
    + "window.__SFX_META__ = " + JSON.stringify(meta || null) + ";\n"
    // mode: "fraction" (progresso relativo a esta pagina) | "pixel" (mesmos offsets da origem)
    + "(function(){function go(){window.__SFX__=SFX.init(window.__SFX_TRACKS__,{meta:window.__SFX_META__,mode:\"fraction\"});}"
    + "if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",go);else go();})();\n";
}

/* detecção de stack ao abrir o popup */
(async () => {
  if (!EXT) return;
  const tab = await activeTabId(); if (!tab) return;
  if (await ensureCapture(tab)) return;
  const r = await send(tab, { cmd: "stack" });
  if (r && r.ok && r.stack && r.stack.length)
    $("stack").innerHTML = r.stack.map((s, i) => `<span style="--i:${i}">${s}</span>`).join("");
})();

$("sample").onclick = async () => {
  const tab = await activeTabId(); if (!tab) return;
  const denied = await ensureCapture(tab);
  if (denied) { status(denied); return; }
  setBusy(true);
  rulerProgress(0, "scan");
  status("Varrendo a página em busca de elementos animados…");
  const r = await send(tab, { cmd: "sample", opts: { duration: +$("dur").value } });
  setBusy(false);
  if (!r || r.error || !r.ok) {
    status("Erro: " + (r && r.error || "a página não respondeu. Tente de novo."));
    rulerBase(); rulerLabel("timeline", false);
    return;
  }
  if (!r.data.length) {
    rulerBase(); rulerLabel("timeline", false);
    status("Nenhum elemento animado por scroll encontrado (" + r.scanned + " elementos varridos). A animação pode ser em canvas/WebGL — aí a captura de estilos não alcança.");
    setOutput("", false);
    return;
  }
  const src = await runtimeSrc();
  const keys = r.data.reduce((n, t) => n + t.keys.length, 0);
  setOutput(buildBundle(r.data, src, r.meta), true);
  rulerKeys(r.data);
  status("<b>" + r.data.length + " alvos</b>, " + keys + " keyframes (de " + r.animated
    + " elementos que mudam). Copie ou baixe o .js.");
};

$("css").onclick = async () => {
  const tab = await activeTabId(); if (!tab) return;
  const denied = await ensureCapture(tab);
  if (denied) { status(denied); return; }
  status("Extraindo CSS nativo…");
  const r = await send(tab, { cmd: "native" });
  if (!r || r.error || !r.ok) { status("Erro: " + (r && r.error || "a página não respondeu.")); return; }
  if (!r.css.trim()) { status("Esta página não usa scroll-driven animations nativas de CSS."); return; }
  setOutput(r.css, true);
  status("CSS nativo extraído — cole num .css da sua página.");
};

$("copy").onclick = async () => {
  if (!bundleSrc) return;
  await navigator.clipboard.writeText(bundleSrc);
  $("copy").classList.add("ok");
  $("copyLabel").textContent = "Copiado ✓";
  setTimeout(() => { $("copy").classList.remove("ok"); $("copyLabel").textContent = "Copiar"; }, 1400);
};
$("dl").onclick = () => {
  if (!bundleSrc) return;
  const blob = new Blob([bundleSrc], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "scrollfx.bundle.js"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

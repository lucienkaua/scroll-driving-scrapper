"use strict";
const $ = (id) => document.getElementById(id);
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
    ruler.moveTo(x, RH - 8); ruler.lineTo(x, RH - 4);
  }
  ruler.stroke();
}
function rulerProgress(p, phase) {
  rulerBase();
  ruler.fillStyle = phase === "scan" ? css("--line") : css("--rec");
  ruler.fillRect(4, 10, (RW - 8) * (p / 100), 6);
}
function rulerKeys(tracks) {
  rulerBase();
  ruler.fillStyle = css("--rec");
  ruler.globalAlpha = 0.28;
  tracks.forEach((t) => t.keys.forEach((k) => {
    ruler.fillRect(4 + (RW - 8) * k.p, 6, 1.5, 14);
  }));
  ruler.globalAlpha = 1;
}
rulerBase();

const status = (html) => { $("status").innerHTML = html; };
const kb = (s) => (new Blob([s]).size / 1024).toFixed(1) + " KB";
function setBusy(b) {
  busy = b;
  $("sample").disabled = b; $("css").disabled = b; $("dur").disabled = b;
  $("dot").classList.toggle("live", b);
}
function setOutput(src, sizeLabel) {
  bundleSrc = src;
  $("out").value = src;
  $("size").textContent = sizeLabel ? kb(src) : "";
}

chrome.runtime.onMessage.addListener((m) => {
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
function send(tab, msg) {
  return new Promise((res) => chrome.tabs.sendMessage(tab, msg, (r) =>
    res(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : r)));
}
function friendly(err) {
  if (/Receiving end does not exist|Could not establish connection/i.test(err))
    return "Sem acesso à página. Recarregue a aba alvo (F5) e tente de novo — ou é uma página interna do navegador, onde captura não funciona.";
  return "Erro: " + err;
}
async function runtimeSrc() {
  return (await fetch(chrome.runtime.getURL("runtime/scrollfx.runtime.js"))).text();
}
function buildBundle(tracks, src, meta) {
  return "/* SFX bundle - " + (meta && meta.url || "") + " - " + new Date().toISOString() + " */\n"
    + src + "\n;\n"
    + "window.__SFX_TRACKS__ = " + JSON.stringify(tracks) + ";\n"
    + "(function(){function go(){window.__SFX__=SFX.init(window.__SFX_TRACKS__);}"
    + "if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",go);else go();})();\n";
}

/* detecção de stack ao abrir o popup (silenciosa se a página não responder) */
(async () => {
  const tab = await activeTabId(); if (!tab) return;
  const r = await send(tab, { cmd: "stack" });
  if (r && r.ok && r.stack && r.stack.length)
    $("stack").innerHTML = r.stack.map((s) => "<span>" + s + "</span>").join("");
})();

$("sample").onclick = async () => {
  const tab = await activeTabId(); if (!tab) return;
  setBusy(true);
  rulerProgress(0, "scan");
  status("Varrendo a página em busca de elementos animados…");
  const r = await send(tab, { cmd: "sample", opts: { duration: +$("dur").value } });
  setBusy(false);
  if (!r || r.error || !r.ok) { status(friendly(r && (r.error || r.errorMsg) || "sem resposta")); rulerBase(); return; }
  if (!r.data.length) {
    rulerBase();
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
  status("Extraindo CSS nativo…");
  const r = await send(tab, { cmd: "native" });
  if (!r || r.error || !r.ok) { status(friendly(r && r.error || "sem resposta")); return; }
  if (!r.css.trim()) { status("Esta página não usa scroll-driven animations nativas de CSS."); return; }
  setOutput(r.css, true);
  status("CSS nativo extraído — cole num .css da sua página.");
};

$("copy").onclick = async () => {
  if (!bundleSrc) return;
  await navigator.clipboard.writeText(bundleSrc);
  status("Copiado para a área de transferência.");
};
$("dl").onclick = () => {
  if (!bundleSrc) return;
  const blob = new Blob([bundleSrc], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "scrollfx.bundle.js"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

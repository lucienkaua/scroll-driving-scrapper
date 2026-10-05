/* SFX Clone - capturador. Injetado pelo popup (chrome.scripting) ou colado no Console. */
(function () {
  "use strict";
  // o popup injeta a cada abertura - evita listeners duplicados
  if (globalThis.__SFX_CS__) return;
  globalThis.__SFX_CS__ = "1.2.0";
  var MAX_ELS = 300;    // alvos animados acompanhados na gravação
  var MAX_SCAN = 4000;  // elementos inspecionados na varredura
  var SCAN_STOPS = 13;  // paradas da varredura rápida (0..1)
  // "pin" e um pseudo-prop: position/top/left/width/height quando fixed|sticky
  // (captura o pinning de secoes estilo ScrollTrigger)
  var PROPS = ["transform", "opacity", "filter", "clipPath", "backgroundPosition", "pin"];

  function cssEsc(s) { return (globalThis.CSS && CSS.escape) ? CSS.escape(s) : String(s); }
  function parseT(t) {
    if (!t || t === "none") return [1, 0, 0, 1, 0, 0];
    var m = /matrix\(([^)]+)\)/.exec(t);
    return m ? m[1].split(",").map(parseFloat) : [1, 0, 0, 1, 0, 0];
  }
  function tokenize(str) {
    if (str == null) return [];
    return String(str).match(/-?\d*\.?\d+(?:e-?\d+)?|\s|[^ \d.]/gi) || [];
  }

  function segFor(n) {
    var seg = n.tagName.toLowerCase();
    var cls = Array.prototype.slice.call(n.classList).slice(0, 2).map(cssEsc).join(".");
    if (cls) seg += "." + cls;
    var parent = n.parentElement;
    if (parent) {
      var same = Array.prototype.slice.call(parent.children).filter(function (c) { return c.tagName === n.tagName; });
      if (same.length > 1) seg += ":nth-of-type(" + (same.indexOf(n) + 1) + ")";
    }
    return seg;
  }
  function buildSelector(el) {
    if (el.id) {
      var idSel = "#" + cssEsc(el.id);
      try { if (document.querySelectorAll(idSel).length === 1) return idSel; } catch (e) {}
    }
    var segs = [], n = el;
    while (n && n.nodeType === 1 && n !== document.body && segs.length < 8) {
      if (n.id) { segs.unshift("#" + cssEsc(n.id)); break; }
      segs.unshift(segFor(n));
      n = n.parentElement;
    }
    // usa o sufixo mais curto do caminho que identifica o elemento sozinho
    for (var d = 1; d <= segs.length; d++) {
      var sel = segs.slice(segs.length - d).join(" > ");
      try { if (document.querySelectorAll(sel).length === 1) return sel; } catch (e) {}
    }
    return segs.join(" > ");
  }

  function snap(el, props) {
    var cs = getComputedStyle(el), o = {};
    props.forEach(function (p) {
      if (p === "transform") o.transform = parseT(cs.transform);
      else if (p === "opacity") o.opacity = parseFloat(cs.opacity);
      else if (p === "pin") o.pin = (cs.position === "fixed" || cs.position === "sticky")
        ? cs.position + " " + cs.top + " " + cs.left + " " + cs.width + " " + cs.height : "none";
      else o[p] = cs[p];
    });
    return o;
  }
  // distancia entre dois snapshots (numerico em transform/opacity, tokens nas strings)
  function styleDist(a, b) {
    var d = 0;
    PROPS.forEach(function (p) {
      var av = a[p], bv = b[p];
      if (av == null || bv == null) return;
      if (p === "transform") { for (var i = 0; i < 6; i++) d += Math.abs(av[i] - (bv[i] != null ? bv[i] : av[i])); }
      else if (p === "opacity") d += Math.abs(av - bv) * 10;
      else {
        var A = tokenize(av), B = tokenize(bv);
        if (A.length !== B.length) { d += A.length + B.length; return; }
        for (var j = 0; j < A.length; j++) {
          var na = parseFloat(A[j]), nb = parseFloat(B[j]);
          if (!isNaN(na) && !isNaN(nb)) d += Math.abs(na - nb);
          else if (A[j] !== B[j]) d += 1;
        }
      }
    });
    return d;
  }
  function interpStyle(a, b, t) {
    var out = {};
    PROPS.forEach(function (p) {
      var av = a[p], bv = b[p];
      if (p === "transform") out.transform = av.map(function (v, i) { return v + ((bv[i] != null ? bv[i] : v) - v) * t; });
      else if (p === "opacity") out.opacity = av + (bv - av) * t;
      else if (typeof av === "string" && typeof bv === "string") {
        var A = tokenize(av), B = tokenize(bv);
        if (A.length === B.length) {
          var s = "";
          for (var j = 0; j < A.length; j++) {
            var na = parseFloat(A[j]), nb = parseFloat(B[j]);
            s += (!isNaN(na) && !isNaN(nb)) ? na + (nb - na) * t : B[j];
          }
          out[p] = s;
        } else out[p] = t < 0.5 ? av : bv;
      }
    });
    return out;
  }
  // remove pontos internos que caem (quase) na reta entre os vizinhos
  function downsample(keys, tol) {
    tol = tol == null ? 0.75 : tol;
    var ks = keys.slice();
    var changed = true;
    while (changed && ks.length > 2) {
      changed = false;
      for (var i = 1; i < ks.length - 1; i++) {
        var p0 = ks[i - 1].p, p1 = ks[i + 1].p, p = ks[i].p;
        var t = (p - p0) / ((p1 - p0) || 1);
        if (styleDist(ks[i].s, interpStyle(ks[i - 1].s, ks[i + 1].s, t)) < tol) {
          ks.splice(i, 1); changed = true; break;
        }
      }
    }
    return ks;
  }
  function emit(progress, phase) {
    try {
      if (globalThis.chrome && chrome.runtime && chrome.runtime.sendMessage)
        chrome.runtime.sendMessage({ type: "sfx-progress", p: Math.round(progress * 100), phase: phase || "rec" });
    } catch (e) {}
  }
  function nextFrames(n) {
    return new Promise(function (res) {
      function step() { if (--n <= 0) res(); else requestAnimationFrame(step); }
      requestAnimationFrame(step);
    });
  }
  function pageTotal() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function candidates() {
    var skip = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, NOSCRIPT: 1, TEMPLATE: 1, BR: 1, WBR: 1 };
    var all = document.body ? document.body.getElementsByTagName("*") : [];
    var out = [];
    for (var i = 0; i < all.length && out.length < MAX_SCAN; i++) {
      if (!skip[all[i].tagName]) out.push(all[i]);
    }
    return out;
  }

  // Fase 1: para em alguns pontos da pagina e marca os elementos cujo estilo muda.
  // Assim a gravacao (fase 2) so acompanha quem de fato anima, em vez dos
  // primeiros N elementos do documento.
  function prescan(els, props) {
    var base = new Array(els.length);
    var flags = new Array(els.length);
    var stop = 0;
    function atStop() {
      for (var i = 0; i < els.length; i++) {
        if (flags[i] || !els[i].isConnected) continue;
        var s = snap(els[i], props);
        if (!base[i]) base[i] = s;
        else if (styleDist(base[i], s) > 0.05) flags[i] = true;
      }
      emit(0.02 + 0.18 * (stop / SCAN_STOPS), "scan");
    }
    function next() {
      if (stop > SCAN_STOPS) {
        var idx = [];
        for (var i = 0; i < flags.length && idx.length < MAX_ELS; i++) if (flags[i]) idx.push(i);
        return Promise.resolve(idx);
      }
      window.scrollTo(0, (stop / SCAN_STOPS) * pageTotal());
      return nextFrames(4).then(function () { atStop(); stop++; return next(); });
    }
    return next();
  }

  // Fase 2: rolagem continua gravando keyframes indexados pelo progresso REAL
  // de scroll (robusto a paginas que crescem com lazy-load durante a captura).
  function record(els, sels, props, duration) {
    return new Promise(function (resolve) {
      var records = new Array(els.length);
      var prev = new Array(els.length);
      var started = false, pPrev = 0, pMax = 0, pLastRead = null;
      function readAll(p) {
        if (p < pMax) p = pMax; else pMax = p;
        var pr3 = Math.round(p * 1000) / 1000;
        els.forEach(function (el, i) {
          if (!el.isConnected) return;
          var s = snap(el, props), pr = prev[i];
          if (!pr || styleDist(pr, s) > 1e-4) {
            if (records[i] === undefined) records[i] = { sel: sels[i], keys: [] };
            var keys = records[i].keys;
            // ancora o estado anterior no frame anterior a mudanca - sem isso a
            // interpolacao "borra" transicoes que ficaram paradas (pin, reveals)
            if (pr && pLastRead != null && keys.length && keys[keys.length - 1].p < pLastRead)
              keys.push({ p: pLastRead, s: pr });
            keys.push({ p: pr3, s: s });
            prev[i] = s;
          }
        });
        pLastRead = pr3;
      }
      window.scrollTo(0, 0);
      nextFrames(6).then(function () {
        var t0 = performance.now();
        function tick(now) {
          var t = Math.min(1, (now - t0) / duration);
          if (started) readAll(pPrev); // le o estado da posicao rolada no frame anterior
          var total = pageTotal();
          window.scrollTo(0, t * total);
          pPrev = Math.min(1, window.scrollY / total);
          started = true;
          emit(0.2 + 0.8 * t, "rec");
          if (t < 1) requestAnimationFrame(tick);
          else {
            readAll(1);
            resolve(records.filter(Boolean)
              .map(function (r) { return { sel: r.sel, keys: downsample(r.keys) }; })
              .filter(function (r) { return r.keys.length >= 2; }));
          }
        }
        requestAnimationFrame(tick);
      });
    });
  }

  function startSample(opts) {
    opts = opts || {};
    var duration = opts.duration;
    var props = opts.props || PROPS;
    var root = document.documentElement;
    var prevSB = root.style.scrollBehavior, prevBodySB = document.body ? document.body.style.scrollBehavior : "";
    var startY = window.scrollY;
    root.style.scrollBehavior = "auto";
    if (document.body) document.body.style.scrollBehavior = "auto";
    var els = candidates();
    return prescan(els, props).then(function (idx) {
      // Auto: velocidade de scroll ~constante (1200 px/s) em vez de tempo fixo -
      // efeitos scrubbed sao deterministas (tempo nao melhora) e animacoes
      // infinitas por tempo (marquees) so acumulam ruido em capturas longas.
      // Calculado apos a varredura, com o lazy-load ja carregado.
      if (!duration || duration === "auto")
        duration = Math.max(8000, Math.min(35000, pageTotal() / 1.2));
      var chosen = idx.map(function (i) { return els[i]; });
      var sels = chosen.map(buildSelector);
      if (!chosen.length) return { tracks: [], scanned: els.length, animated: 0 };
      return record(chosen, sels, props, duration).then(function (tracks) {
        return { tracks: tracks, scanned: els.length, animated: chosen.length };
      });
    }).then(function (res) {
      root.style.scrollBehavior = prevSB;
      if (document.body) document.body.style.scrollBehavior = prevBodySB;
      try { window.scrollTo(0, startY); } catch (e) {}
      res.meta = {
        url: location.href,
        scrollHeight: document.documentElement.scrollHeight,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        capturedAt: new Date().toISOString()
      };
      return res;
    });
  }

  function extractNative() {
    var out = [], kfNames = {};
    Array.prototype.slice.call(document.querySelectorAll("*")).forEach(function (el) {
      var cs = getComputedStyle(el), tl = cs.animationTimeline || "";
      if (tl && !/^(auto|none)$/.test(tl) && /scroll|view|--/.test(tl)) {
        var decl = [];
        ["animationName", "animationDuration", "animationTimingFunction", "animationDelay", "animationDirection",
         "animationFillMode", "animationIterationCount", "animationTimeline", "animationRangeStart", "animationRangeEnd",
         "viewTimelineName", "viewTimelineAxis", "viewTimelineInsetBlockStart", "viewTimelineInsetBlockEnd",
         "scrollTimelineName", "scrollTimelineAxis", "timelineScope"].forEach(function (k) {
          var v = cs[k];
          if (v && v !== "none" && v !== "normal" && v !== "auto")
            decl.push(k.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }) + ": " + v + ";");
        });
        out.push(buildSelector(el) + " {\n  " + decl.join("\n  ") + "\n}");
        (cs.animationName || "").split(",").forEach(function (nm) { kfNames[nm.trim()] = 1; });
      }
    });
    var kfs = [];
    for (var si = 0; si < document.styleSheets.length; si++) {
      var rules; try { rules = document.styleSheets[si].cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var ri = 0; ri < rules.length; ri++) {
        var r = rules[ri];
        if (r.type === CSSRule.KEYFRAMES_RULE && kfNames[r.name]) {
          var body = "";
          for (var fi = 0; fi < r.cssRules.length; fi++)
            body += "  " + r.cssRules[fi].keyText + " { " + r.cssRules[fi].style.cssText + " }\n";
          kfs.push("@keyframes " + r.name + " {\n" + body + "}");
        }
      }
    }
    return kfs.concat(out).join("\n\n");
  }

  // Heuristicas: globals (quando colado no Console) + marcas no DOM (content script
  // roda em mundo isolado e nao enxerga window da pagina).
  function detectStack() {
    var found = {};
    var GLOBALS = [
      ["gsap", "GSAP"], ["ScrollTrigger", "ScrollTrigger"], ["Lenis", "Lenis"],
      ["THREE", "Three.js"], ["LocomotiveScroll", "Locomotive Scroll"], ["AOS", "AOS"],
      ["Swiper", "Swiper"], ["lottie", "Lottie"], ["barba", "Barba.js"], ["jQuery", "jQuery"]
    ];
    try { GLOBALS.forEach(function (g) { if (window[g[0]]) found[g[1]] = 1; }); } catch (e) {}
    var SRC = [
      [/gsap/i, "GSAP"], [/scrolltrigger/i, "ScrollTrigger"], [/lenis/i, "Lenis"],
      [/three(\.min)?\.js|three\//i, "Three.js"], [/locomotive/i, "Locomotive Scroll"],
      [/aos(\.min)?\.(js|css)/i, "AOS"], [/swiper/i, "Swiper"], [/lottie/i, "Lottie"],
      [/framer|motion/i, "Motion"], [/rive/i, "Rive"], [/spline/i, "Spline"], [/barba/i, "Barba.js"]
    ];
    Array.prototype.slice.call(document.querySelectorAll("script[src], link[href]")).forEach(function (s) {
      var u = s.src || s.href || "";
      SRC.forEach(function (m) { if (m[0].test(u)) found[m[1]] = 1; });
    });
    if (document.querySelector("[data-aos]")) found["AOS"] = 1;
    if (document.querySelector("[data-scroll], [data-scroll-container]")) found["Locomotive Scroll"] = 1;
    if (document.querySelector(".swiper, .swiper-container")) found["Swiper"] = 1;
    if (document.querySelector("[data-framer-name], #__framer")) found["Framer"] = 1;
    if (document.querySelector("#__next")) found["Next.js"] = 1;
    if (document.querySelector("#__nuxt")) found["Nuxt"] = 1;
    if (document.querySelector("canvas")) found["Canvas/WebGL"] = 1;
    var nativeCount = 0;
    Array.prototype.slice.call(document.querySelectorAll("*")).some(function (el) {
      var tl = getComputedStyle(el).animationTimeline || "";
      if (tl && !/^(auto|none)$/.test(tl)) { nativeCount++; return true; }
      return false;
    });
    if (nativeCount) found["CSS Scroll-driven"] = 1;
    return Object.keys(found).sort();
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function (msg, sender, send) {
      if (msg && msg.cmd === "sample") {
        startSample(msg.opts || {}).then(function (res) {
          send({ ok: true, data: res.tracks, meta: res.meta, scanned: res.scanned, animated: res.animated });
        }).catch(function (e) { send({ ok: false, error: String(e) }); });
        return true;
      }
      if (msg && msg.cmd === "native") {
        try { send({ ok: true, css: extractNative() }); } catch (e) { send({ ok: false, error: String(e) }); }
        return true;
      }
      if (msg && msg.cmd === "stack") {
        try { send({ ok: true, stack: detectStack() }); } catch (e) { send({ ok: false, error: String(e) }); }
        return true;
      }
    });
  } else {
    globalThis.SFXCapture = {
      startSample: startSample, extractNative: extractNative, detectStack: detectStack,
      PROPS: PROPS, MAX_ELS: MAX_ELS
    };
  }
})();

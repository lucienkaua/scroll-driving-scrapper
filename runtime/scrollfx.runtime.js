/* SFX Runtime - reproduz tracks capturadas por SFX Clone. Sem dependencias. */
(function (global) {
  "use strict";
  function idm() { return [1, 0, 0, 1, 0, 0]; }
  function parseTransform(t) {
    if (!t || t === "none") return idm();
    var m = /matrix\(([^)]+)\)/.exec(t);
    if (m) return m[1].split(",").map(parseFloat);
    return idm();
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpArr(a, b, t) { return a.map(function (v, i) { return lerp(v, b[i] != null ? b[i] : v, t); }); }
  function tokenize(str) {
    if (str == null) return [];
    return String(str).match(/-?\d*\.?\d+(?:e-?\d+)?|\s|[^ \d.]/gi) || [];
  }
  function lerpTokens(a, b, t) {
    var A = tokenize(a), B = tokenize(b);
    if (A.length !== B.length) return t < 0.5 ? a : b;
    var out = "";
    for (var i = 0; i < A.length; i++) {
      var na = parseFloat(A[i]), nb = parseFloat(B[i]);
      out += (!isNaN(na) && !isNaN(nb)) ? lerp(na, nb, t) : B[i];
    }
    return out;
  }
  var STR_PROPS = ["filter", "clipPath", "backgroundPosition", "pin"];
  // pin: "fixed|sticky top left width height" capturado de secoes pinadas; "none" despina
  function applyPin(el, v) {
    if (!v || v === "none") {
      el.style.position = ""; el.style.top = ""; el.style.left = "";
      el.style.width = ""; el.style.height = "";
      return;
    }
    var m = /^(fixed|sticky)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/.exec(v);
    if (!m) return;
    el.style.position = m[1]; el.style.top = m[2]; el.style.left = m[3];
    el.style.width = m[4]; el.style.height = m[5];
  }
  function lerpStyle(A, B, t, out) {
    if (A.transform || B.transform)
      out.transform = "matrix(" + lerpArr(A.transform || idm(), B.transform || idm(), t)
        .map(function (n) { return Math.round(n * 10000) / 10000; }).join(",") + ")";
    if (A.opacity != null || B.opacity != null)
      out.opacity = Math.round(lerp(A.opacity != null ? A.opacity : 1, B.opacity != null ? B.opacity : 1, t) * 1000) / 1000;
    STR_PROPS.forEach(function (k) {
      if (A[k] != null && B[k] != null) out[k] = lerpTokens(A[k], B[k], t);
      else if (t < 0.5 && A[k] != null) out[k] = A[k];
      else if (B[k] != null) out[k] = B[k];
    });
    return out;
  }
  function findKeys(keys, p) {
    if (p <= keys[0].p) return [0, 0, 0];
    var last = keys.length - 1;
    if (p >= keys[last].p) return [last, last, 0];
    var lo = 0, hi = last;
    while (hi - lo > 1) { var mid = (hi + lo) >> 1; if (keys[mid].p <= p) lo = mid; else hi = mid; }
    var span = keys[hi].p - keys[lo].p || 1;
    return [lo, hi, (p - keys[lo].p) / span];
  }
  function trackProps(keys) {
    var seen = {};
    keys.forEach(function (k) {
      if (k.s.transform) seen.transform = 1;
      if (k.s.opacity != null) seen.opacity = 1;
      STR_PROPS.forEach(function (sp) { if (k.s[sp] != null) seen[sp] = 1; });
    });
    return Object.keys(seen);
  }
  function SFXRuntime(opts) {
    var tracks = opts.tracks || [];
    var reduced = opts.respectReducedMotion !== false &&
      global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var items = [];
    function load() {
      items.forEach(restore);
      items.length = 0;
      if (reduced) return;
      tracks.forEach(function (tr) {
        if (!tr.keys || tr.keys.length < 2) return;
        var props = trackProps(tr.keys);
        var list; try { list = document.querySelectorAll(tr.sel); } catch (e) { return; }
        list.forEach(function (el) {
          items.push({ el: el, keys: tr.keys, props: props, saved: el.getAttribute("style") });
          if (opts.willChange !== false) el.style.willChange = props
            .filter(function (p) { return p !== "pin"; })
            .map(function (p) { return p.replace(/[A-Z]/g, function (m) { return "-" + m.toLowerCase(); }); }).join(",");
        });
      });
    }
    function restore(it) {
      if (it.saved == null) it.el.removeAttribute("style");
      else it.el.setAttribute("style", it.saved);
    }
    // mode "fraction" (padrao): progresso relativo a altura DESTA pagina.
    // mode "pixel": progresso sobre a mesma faixa de pixels da pagina de origem
    // (opts.meta vem do bundle) - os efeitos acontecem nos mesmos offsets.
    function progress() {
      var total;
      if (opts.mode === "pixel" && opts.meta && opts.meta.scrollHeight)
        total = opts.meta.scrollHeight - (opts.meta.viewport && opts.meta.viewport.h || global.innerHeight);
      else total = document.documentElement.scrollHeight - global.innerHeight;
      return total > 0 ? Math.max(0, Math.min(1, global.scrollY / total)) : 0;
    }
    function apply(it, p) {
      var k = it.keys;
      var r = findKeys(k, p), st = lerpStyle(k[r[0]].s, k[r[1]].s, r[2], {});
      if (st.transform != null) it.el.style.transform = st.transform;
      if (st.opacity != null) it.el.style.opacity = st.opacity;
      if (st.filter != null) it.el.style.filter = st.filter;
      if (st.clipPath != null) it.el.style.clipPath = st.clipPath;
      if (st.backgroundPosition != null) it.el.style.backgroundPosition = st.backgroundPosition;
      if (st.pin != null) applyPin(it.el, st.pin);
    }
    function update() {
      var p = progress();
      for (var i = 0; i < items.length; i++) apply(items[i], p);
    }
    var queued = false;
    function onScroll() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; update(); }); } }
    function destroy() {
      global.removeEventListener("scroll", onScroll);
      global.removeEventListener("resize", onScroll);
      items.forEach(restore);
      items.length = 0;
    }
    if (!reduced) {
      global.addEventListener("scroll", onScroll, { passive: true });
      global.addEventListener("resize", onScroll, { passive: true });
    }
    load(); update();
    return { reload: load, update: update, destroy: destroy, reduced: reduced, count: function () { return items.length; } };
  }
  global.SFX = global.SFX || {};
  global.SFX.version = "1.3.0";
  global.SFX.init = function (tracks, opts) { return new SFXRuntime(Object.assign({ tracks: tracks }, opts)); };
})(typeof window !== "undefined" ? window : this);

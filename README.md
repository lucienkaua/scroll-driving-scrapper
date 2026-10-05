# SFX Clone — Scroll Effects Scrapper

Extensão de Chrome (Manifest V3) que **clona as animações de rolagem de qualquer site** e as empacota num `.js` auto-contido, pronto para colar em outra página. Aponte para um site de referência, capture, cole o bundle no seu projeto.

## Como funciona

```
┌─ content.js ─────────────┐   ┌─ popup ──────────────┐   ┌─ runtime ────────────┐
│ 1. varre a página em 13  │   │ monta o bundle:      │   │ no SEU site:         │
│    paradas de scroll e   │ → │ runtime + tracks +   │ → │ escuta o scroll,     │
│    acha o que anima      │   │ auto-init            │   │ interpola keyframes  │
│ 2. grava keyframes       │   │ (copiar / baixar)    │   │ e aplica os estilos  │
│    (progresso 0→1)       │   │                      │   │ (rAF, passive)       │
└──────────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

- **Captura em 2 fases**: uma varredura rápida descobre *quais* elementos mudam com o scroll; a gravação contínua acompanha só esses (até 300), com keyframes indexados pelo progresso real de scroll e simplificados por downsampling geométrico.
- **Propriedades capturadas**: `transform`, `opacity`, `filter`, `clip-path`, `background-position` — as que animam bem na GPU.
- **Dois modos de extração**: gravação por amostragem (funciona com GSAP, Lenis, Motion, qualquer JS) ou extração do CSS nativo (`animation-timeline: scroll()/view()` + `@keyframes`) como CSS puro.
- **Detecção de stack**: o popup mostra as libs de animação detectadas na página (GSAP, ScrollTrigger, Lenis, Three.js, CSS Scroll-driven…).
- **Runtime respeitoso**: `prefers-reduced-motion`, `will-change` automático, `destroy()` que restaura os estilos originais, zero dependências (~4KB).

## Instalação

1. `chrome://extensions` → ativar **Modo do desenvolvedor**
2. **Carregar sem compactação** → selecionar esta pasta
3. Abrir o site alvo → clicar no ícone → **Capturar rolagem**

O `content/content.js` também funciona colado direto no Console do DevTools (sem extensão): expõe `SFXCapture.startSample()`, `SFXCapture.extractNative()` e `SFXCapture.detectStack()`.

## Usando o bundle

```html
<script src="scrollfx.bundle.js"></script> <!-- antes do </body> -->
```

O bundle se auto-inicializa e expõe `window.__SFX__` (`reload()`, `update()`, `destroy()`).

## Validação

Harness real de ponta a ponta em `tools/validate.mjs`: captura no site vivo, snapshots de verdade-terreno em 5 posições de scroll, replay na mesma página com **scripts bloqueados e animações CSS desligadas**, comparação estilo a estilo.

```bash
npm install
npm run validate              # 3 sites padrão
node tools/validate.mjs URL   # site à escolha
```

| Site | Paradigma | Nota (0–10) |
|---|---|---|
| scroll-driven-animations.style | CSS nativo | **9.9** |
| lenis.darkroom.engineering | Lenis | **9.7** |
| gsap.com | GSAP + ScrollTrigger | **8.6** |

Critérios, pesos e limitações conhecidas: [docs/TEST-REPORT.md](docs/TEST-REPORT.md).

## Skill para agentes (Claude Code)

[`skills/scroll-driven-sites/`](skills/scroll-driven-sites/SKILL.md): skill de construção de sites com animações de scroll profissionais — árvore de decisão de stack (CSS nativo / GSAP+ScrollTrigger+Lenis / Motion), números de timing e easing calibrados, regras de performance e receitas completas. Os bundles capturados pelo SFX Clone servem como espec de timing para recriar efeitos de forma limpa.

Instalação: copie a pasta para `~/.claude/skills/`.

## Limitações

- Animações **disparadas por tempo** (IntersectionObserver + duração fixa) são gravadas no estado em que passaram pela captura — scrub e parallax determinísticos reproduzem com fidelidade; reveals por tempo ficam aproximados.
- **Canvas/WebGL** não é alcançável via estilos computados (a detecção de stack avisa).
- Páginas internas do navegador (`chrome://`, Web Store) não permitem captura.

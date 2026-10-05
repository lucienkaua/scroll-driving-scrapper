# Guia de teste manual — SFX Clone v1.2

## Preparação (1 minuto)

1. `chrome://extensions` → ligar **Modo do desenvolvedor** (canto superior direito)
2. **Carregar sem compactação** → selecionar a pasta do projeto
3. Fixar o ícone da extensão na barra (puzzle → pin)

> Desde a v1.2 o capturador é injetado na hora do clique (`activeTab` + `scripting`) — funciona em abas já abertas, sem F5, e sempre na versão atual. Se recarregar a extensão em `chrome://extensions`, feche e reabra o popup.

## Roteiro por site

Em todos: abra o site, espere carregar, clique no ícone da extensão e confira primeiro os **badges de stack** no topo do popup.

### 1. https://scroll-driven-animations.style/ — CSS nativo (nota 9.9)

- Badges esperados: `CSS SCROLL-DRIVEN`, `RIVE`.
- **Capturar rolagem** (8s): a página rola sozinha; a régua mostra a varredura (cinza) e depois a gravação (vermelho). Esperado: **~15 alvos** e ticks espalhados na régua.
- Teste também o botão **Extrair CSS nativo**: deve sair ~6KB de CSS com `@keyframes` + `animation-timeline` — este site é o único dos três que usa a API nativa.

### 2. https://lenis.darkroom.engineering/ — Lenis (nota 9.7)

- Badges esperados: `LENIS`, `CANVAS/WEBGL`.
- Captura esperada: **~23 alvos, ~480 keyframes** (textos e blocos com transform scrubado).
- Repare que o smooth scroll do Lenis não atrapalha a captura.

### 3. https://gsap.com/ — GSAP + ScrollTrigger (nota 8.6)

- Badges esperados: `GSAP`, `SCROLLTRIGGER`.
- Captura esperada: **~50 alvos**. É o teste de estresse: site grande (~1500 elementos varridos).
- Limitação visível aqui: tweens de entrada disparados por tempo ficam "assados" no estado da passagem — o esperado, documentado no [TEST-REPORT](TEST-REPORT.md).

## Rodada 2 — paradigmas ainda não cobertos (baselines do harness @ 12s)

| Site | Paradigma | Alvos | Bundle | Fidelidade | Nota |
|---|---|---|---|---|---|
| apple.com/br/airpods-pro | Scrollytelling in-house, sticky, DOM gigante (3.170 el.) | ~55 | ~52 KB | 0.80 | 8.6 |
| michalsnik.github.io/aos | AOS (reveals em massa) | ~29 | ~118 KB | 0.93 | 9.6 |
| motion.dev | Motion/React (springs por tempo) — **caso-limite proposital** | ~5 | ~33 KB | 0.16 | 5.4 |
| locomotive.ca/en (bônus) | Locomotive Scroll (scroll virtual) — limite documentado | ~2 | ~8 KB | 1.00 | 8.9 |

## Validando o bundle gerado (o teste que convence)

A graça é ver o site animando **sem o próprio motor de animação dele**:

1. Capture e **Baixe** o `scrollfx.bundle.js` do site.
2. No Chrome, bloqueie o JavaScript só daquele site: cadeado na barra de endereço → **Configurações do site** → JavaScript → **Bloquear**.
3. Recarregue a página — ela fica estática (sem GSAP/Lenis, sem animação nenhuma).
4. Abra o DevTools → Console → cole o conteúdo do bundle → Enter. (O console executa mesmo com o JS da página bloqueado.)
5. **Role a página**: as animações capturadas voltam à vida, dirigidas só pelo runtime de ~4KB.
6. Desfaça o bloqueio de JS ao terminar.

No console, o bundle expõe `window.__SFX__` — `destroy()` restaura os estilos originais na hora (bom para comparar com/sem).

## Demo local

`demo/demo.html` no navegador: parallax nativo (seção 1) + reveals por IntersectionObserver. Bom para testar rápido o ciclo completo captura → bundle, e para ver a limitação de reveals por tempo.

## Validação automatizada

```bash
npm install
npm run validate              # os 3 sites acima, com notas
node tools/validate.mjs URL   # qualquer outro site
```

Resultados em `tools/out/results.json`; metodologia e critérios em [TEST-REPORT.md](TEST-REPORT.md).

## Checklist de regressão do popup

- [ ] Badges de stack aparecem ao abrir em site compatível
- [ ] Captura mostra 2 fases na régua (cinza → vermelho) e o dot pulsa
- [ ] Ao final, régua mostra ticks nas posições dos keyframes
- [ ] Status reporta alvos/keyframes; Copiar e Baixar funcionam
- [ ] Em `chrome://extensions` (página interna): mensagem amigável, sem erro cru
- [ ] Página sem animação de scroll: mensagem "nenhum elemento animado…"

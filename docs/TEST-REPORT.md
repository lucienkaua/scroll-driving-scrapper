# Relatório de validação — SFX Clone v1.1

Data: 2026-10-05 · Harness: `tools/validate.mjs` (playwright-core + Edge headless)

## Metodologia

Para cada site, o harness executa o pipeline completo da ferramenta, sem atalhos:

1. Injeta o `content.js` (modo console) no site **vivo** e roda a captura real (varredura + gravação de 6s).
2. Tira snapshots de **verdade-terreno**: o site original, parado em 5 posições de scroll (15%, 35%, 55%, 75%, 90%), com 900ms de assentamento por posição.
3. Recarrega a página com **todos os scripts bloqueados** e `animation/transition: none` — ou seja, um site "morto", sem nenhuma animação própria.
4. Injeta apenas o `scrollfx.runtime.js` + as tracks capturadas e mede os mesmos elementos nas mesmas 5 posições.
5. Compara estilo a estilo (matriz de transform, opacity, filter, clip-path, background-position).

Isso mede o pipeline inteiro: qualidade da captura → robustez dos seletores → correção da reprodução.

## Critérios e pesos

| Critério | Peso | Definição |
|---|---|---|
| **Fidelidade de reprodução** | 35% | 1 − (erro médio ÷ amplitude da animação do próprio elemento), médio entre elementos que de fato animam no trecho medido |
| **Cobertura de captura** | 25% | volume de alvos (até 15 satura) × retenção varredura→gravação |
| **Robustez de seletores** | 20% | % de seletores que resolvem **unicamente** após reload (crédito parcial se resolve ambíguo) |
| **Eficiência do bundle** | 10% | KB do bundle gerado (10 ≤ 60KB, 0 ≥ 500KB) |
| **Performance de captura** | 10% | tempo total da captura vs nominal (10 ≤ 15s, 0 ≥ 45s) |

## Resultados

| Site | Stack detectada | Alvos | Keys | Bundle | Fidelidade | Cobertura | Seletores | Nota |
|---|---|---|---|---|---|---|---|---|
| [scroll-driven-animations.style](https://scroll-driven-animations.style/) | CSS Scroll-driven, Rive | 15 | 173 | 30.3 KB | 9.8 | 10 | 10/10 únicos | **9.9** |
| [lenis.darkroom.engineering](https://lenis.darkroom.engineering/) | Lenis, Canvas/WebGL | 23 | 480 | 65.8 KB | 9.4 | 9.6 | 10/10 únicos | **9.7** |
| [gsap.com](https://gsap.com/) | GSAP, ScrollTrigger | 53 | 565 | 81.8 KB | 7.4 | 8.1 | 10/10 únicos | **8.6** |

Os três sites cobrem os três paradigmas de animação de scroll do mercado: **CSS nativo** (`animation-timeline`), **Lenis** (smooth scroll + transforms JS) e **GSAP + ScrollTrigger** (o padrão da indústria).

### Leitura dos resultados

- **scroll-driven-animations.style (9.9)**: caso ideal — animações 100% determinísticas em função do scroll. O replay num site "morto" ficou a 2% do original. O botão "CSS nativo" extraiu 6KB de CSS scroll-driven puro desta página.
- **lenis.darkroom.engineering (9.7)**: prova que a captura funciona mesmo com scroll suavizado por lib — 23 alvos, 480 keyframes, fidelidade 94%.
- **gsap.com (8.6)**: 53 alvos capturados. A fidelidade menor (74%) tem duas causas honestas: (1) parte do conteúdo é renderizada por JS e não existe na página com scripts bloqueados (replay resolveu 39/53 alvos); (2) animações disparadas por tempo (tweens de entrada) são "assadas" no estado em que passaram pela gravação.

## Limitações conhecidas (medidas, não escondidas)

1. **Animações por tempo** (IntersectionObserver + duração fixa): a captura grava o estado transitório do momento da passagem. Scrub/parallax determinísticos reproduzem fielmente; reveals por tempo ficam aproximados.
2. **Canvas/WebGL**: a captura lê estilos computados do DOM — o que é desenhado dentro de um canvas não é alcançável. A detecção de stack avisa quando há canvas na página.
3. **Scroll virtual total** (quando a lib sequestra o scroll e `window.scrollY` não muda): não observado nos sites testados (Lenis moderno usa scroll nativo), mas é um cenário possível.

## Bug encontrado pelo harness no próprio projeto

O `demo/demo.html` original usava `section { overflow: hidden }` — que cria um *scroll container* e sequestra a `view()` timeline do parallax (progresso fixo em 50%; o efeito nunca funcionou em navegador nenhum). Corrigido para `overflow: clip`. Nota do demo após o fix: 8.1.

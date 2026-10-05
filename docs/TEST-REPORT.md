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

## v1.3 — pinned sections + hold keys (2026-10-05)

A v1.3 captura **pinning** (`position: fixed/sticky` + top/left/width/height) e ancora o estado anterior no frame anterior a cada mudança (*hold keys*), eliminando o borrão de interpolação em transições que ficam paradas e disparam. Resultados após a mudança:

| Alvo | Antes | Depois |
|---|---|---|
| demo local (com seção pinada nova) | 8.1 | **9.2** (fidelidade 1.0) |
| scroll-driven-animations.style | 9.9 | **9.9** |
| lenis.darkroom.engineering | 9.7 | **9.7** |
| gsap.com | 8.6 | **8.7** (59 alvos — elementos pinados agora entram) |

## v1.4 — A/B de duração de captura (2026-10-05)

Hipótese testada: "gravar por mais tempo melhora o resultado". Medição com o harness (`SFX_MS=6000` vs `12000`):

| Site | Fidelidade 6s | Fidelidade 12s | Bundle 6s | Bundle 12s |
|---|---|---|---|---|
| scroll-driven-animations.style (determinístico) | 0.979 | 0.980 | 35 KB | 87 KB |
| lenis.darkroom.engineering | 0.909 | 0.891 | 60 KB | 161 KB |
| gsap.com (marquees/tweens por tempo) | 0.726 | **0.648** | 96 KB | 143 KB |

**Conclusão**: efeitos *scrubbed* são determinísticos — tempo extra não muda nada; animações **por tempo de parede** (marquees, carrosséis) acumulam ciclos "assados" nos keyframes em capturas longas — mais ruído e mais bytes. O que importa é a **velocidade de scroll (px/s)**, que depende da altura da página. Resultado: duração **Auto** (~1200 px/s, limitada a [8s, 35s], calculada após a varredura com lazy-load carregado) virou o padrão; opções manuais 12/20/35s.

## v1.6 — downsample adaptativo por propriedade (2026-10-05)

Caso real encontrado em teste manual: bundle do lenis.dev com **647 KB / 4.716 keyframes** — o smooth scrolling do Lenis muda transforms a cada frame e a tolerância absoluta (0.75px) não podava nada numa galeria que anda 6.700px. Correção: tolerância **por propriedade** = max(piso absoluto, **0.5% da amplitude daquela propriedade na track**). Transform gigante poda agressivo; opacity/pin/rotações sutis mantêm precisão fina mesmo convivendo na mesma track (um key só é removido se TODAS as propriedades ficam dentro da sua própria tolerância).

| Cenário | Antes | Depois |
|---|---|---|
| lenis @ 25s (o caso dos 647 KB) | 4.716 keys / 647 KB (real do usuário) | **201 keys / 35 KB**, fidelidade 0.933 |
| lenis @ 12s | 1.128 keys / 161 KB / fid. 0.891 | **128 keys / 25 KB / fid. 0.966** |
| gsap.com @ 12s | 895 keys / 143 KB / fid. 0.648 | **606 keys / 98 KB / fid. 0.679** |
| sda.style / demo | — | inalterados (sem regressão) |

A fidelidade *sobe* junto com a poda: o ruído de amortecimento baked vira reta — que é o comportamento correto do efeito.

## v1.8 — seletores para DOM dinâmico (2026-10-05)

Achado da rodada 2 de testes manuais: 2/32 seletores da Apple e 1/2 do Locomotive não resolviam entre sessões (DOM com variantes responsivas/testes A/B quebra índice posicional). Correções:

1. **Âncoras `data-*` estáveis** (`data-testid`, `data-aos`, `data-section`…) entram no segmento do seletor; nomes/valores mutáveis (`data-state`, `data-active`…) ou aleatórios ficam de fora.
2. **`nth-of-type` só quando o segmento completo (tag+classes+attr) ainda é ambíguo** entre os irmãos — índice posicional é o que quebra em DOM dinâmico.
3. **ids gerados em runtime rejeitados**: React `useId` (`:r5:`), gradientes SVG (`paint0_linear_…`), ids hasheados.

Medido: suíte sintética 18/18 únicos sem nenhum id/classe/attr instável; Apple **26/26 únicos** (antes 30/32 no teste manual); locomotive 2/2; demo sem regressão (fidelidade 1.0).

**v1.9 (addendum)** — a rodada 3 de testes manuais isolou o último miss da Apple: `staggered-end`, uma **classe de estado** aplicada após a animação rodar (não existe no load fresco). Correção em duas camadas: bloqueio por nome (`is-*`, `has-*`, `active`, `inview`, `aos-animate`, `*-end`…) + **observação real** — a varredura registra o classList em cada uma das 14 paradas e só considera estável a classe presente o tempo todo. O caso exato da Apple passou a gerar `div.viewport-content[data-component-list="StaggeredFadeIn"]`; harness: Apple 25/25 únicos, demo fidelidade 1.0.

## Bug encontrado pelo harness no próprio projeto

O `demo/demo.html` original usava `section { overflow: hidden }` — que cria um *scroll container* e sequestra a `view()` timeline do parallax (progresso fixo em 50%; o efeito nunca funcionou em navegador nenhum). Corrigido para `overflow: clip`. Nota do demo após o fix: 8.1.

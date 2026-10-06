---
name: scroll-driven-sites
description: Constrói sites e landing pages com animações de scroll de nível profissional, escolhendo primeiro o PADRÃO certo (parallax, scrollytelling, infinite scroll vs Load More, snap, horizontal, multi-direcional, reveals) pelo tipo de conteúdo e intenção do usuário, e depois a stack certa — CSS Scroll-driven Animations nativas, GSAP + ScrollTrigger + Lenis, ou Motion para React — com timing/easing calibrados e regras de performance/acessibilidade (WCAG). Use quando pedirem landing page animada, site com efeitos de scroll, scrollytelling, parallax, feed infinito, "site estilo Awwwards", ou para recriar animações capturadas pelo SFX Clone.
---

# Scroll-driven sites

## 1º: escolha de PADRÃO (UX antes de código)

Case o padrão com **tipo de conteúdo + intenção do usuário** — evidências de NN/g e Baymard em [REFERENCE.md](REFERENCE.md) §8:

| Conteúdo / intenção | Padrão |
|---|---|
| Feed de descoberta (social, notícias) | **Infinite scroll** — NUNCA para tarefa com objetivo |
| E-commerce, busca, documentação | **Paginação ou "Load More"** (infinite scroll impede comparar, voltar à posição e compartilhar URL) |
| Storytelling editorial, dado progressivo | **Scrollytelling** (scrub + pin) — exige recurso de design; não para blog comum |
| Campanha/brand microsite | **Parallax** — só em microsite, nunca no site principal, nem mobile-first, nem onde SEO é crítico |
| Landing por seções, tour de produto | **Snap scrolling** (`y mandatory`; use `proximity` se as alturas variam) |
| Portfólio, galeria visual | **Horizontal** (scroll-snap x) — só desktop-first e com a11y de teclado |
| Leitura longa, conteúdo denso | **Scroll normal** — sem snap mandatory, sem hijacking |
| Exploração espacial (showcase criativo) | **Multi-direcional** — nicho; WCAG exige alternativa unidirecional a 400% de zoom |

## 2º: escolha de stack

| Situação | Stack |
|---|---|
| Reveal, parallax leve, barra de progresso | CSS puro: `animation-timeline: view()/scroll()` + fallback `@supports` |
| Pinning, scrub complexo, scroll horizontal, timelines encadeadas | GSAP 3 + ScrollTrigger + Lenis |
| Scrollytelling jornalístico por etapas | Scrollama.js (leve, IntersectionObserver) |
| Projeto React | Motion (`useScroll`/`useTransform`) + Lenis |
| Fundo/distorção "premiada" | Three.js / shaders — ver [REFERENCE.md](REFERENCE.md) §4 |

Prefira sempre o nível mais baixo que resolve: CSS nativo primeiro, JS só quando o efeito exige.

## Os números (o "tateado" que separa amador de profissional)

- **Durações**: hover 100–150ms · press 80–100ms · entrada 300–600ms · saída sempre MAIS CURTA que a entrada · transição de página 400–700ms.
- **Stagger** entre irmãos: 30–100ms (80ms é o sweet spot para headlines).
- **Easing**: nunca `linear` — exceto em *scrub*, onde o scroll é o maestro (`ease: "none"`). Entradas: `power3.out`/`power4.out` ou `cubic-bezier(.22,1,.36,1)`. Interação tátil: spring físico.
- **Parallax**: fator 0.2–0.5. Parallax gritando é amadorismo.

## Regras de performance e acessibilidade (inegociáveis)

1. Anime SÓ `transform` e `opacity`. Nunca `width`, `top`, `left`, `font-size` — forçam layout+paint por frame (jank).
2. `prefers-reduced-motion` é **requisito WCAG 2.1**, não cortesia — movimento de parallax/scrub é nocivo para pessoas com distúrbios vestibulares. Desligar pin/parallax/scrub, manter reveals simples de opacity.
3. **`background-attachment: fixed` é proibido** — quebra completamente no iOS e causa jank no desktop. Use elemento `position: fixed` + conteúdo `position: relative` por cima ([REFERENCE.md](REFERENCE.md) §8.6).
4. **`100vh` mente no iOS** — use o fix de custom property `--vh` ([REFERENCE.md](REFERENCE.md) §9).
5. Reveals por viewport: **IntersectionObserver**, nunca listener de scroll; listeners de touch/wheel sempre `{ passive: true }`.
6. Teclado: horizontal/carrossel exigem navegação por setas + skip links; autoplay precisa ser pausável (W3C WAI).
7. Mobile: desativar seção horizontal e pins pesados; **testar em device real** — DevTools não simula o viewport do iOS.
8. Lição de campo (SFX Clone): efeitos *scrubbed* são determinísticos no scroll; marquees/springs rodam por tempo de parede — não misture os dois no mesmo elemento sem saber qual domina o teste.

## Workflow

1. **Padrão primeiro** (tabela acima), **stack depois**, briefing técnico sempre — efeitos nomeados, física quantificada ([REFERENCE.md](REFERENCE.md) §5).
2. **Esqueleto estático primeiro** (layout + conteúdo real), depois animação camada por camada — uma seção por vez.
3. **Itere como diretor**: "parallax do hero pra 0.5x", "stagger pra 120ms". Cada ajuste nomeia parâmetro + valor.
4. **Valide**: DevTools Performance sem jank, reduced-motion funcional, teclado nos carrosséis, mobile real com scroll normal.

## Integração com SFX Clone

Um bundle `scrollfx.bundle.js` capturado de um site de referência serve como **espec de timing**: os keyframes gravados (progresso 0–1 → transform/opacity/pin) dizem exatamente quando e quanto cada elemento se move. Use-os para recriar o efeito de forma limpa na stack certa em vez de embutir o bundle em produção.

## Receitas completas

[REFERENCE.md](REFERENCE.md): §1 CSS scroll-timeline · §2 GSAP + ScrollTrigger + Lenis · §3 Motion/React · §4 WebGL · §5 template de briefing · §6 vocabulário · §7 componentes de treino · **§8 catálogo dos 8 padrões de scroll (quando usar/evitar, com evidências)** · **§9 mobile & acessibilidade (pisos WCAG, fix do iOS, passive listeners)**.

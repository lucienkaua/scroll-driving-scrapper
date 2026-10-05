---
name: scroll-driven-sites
description: Constrói sites e landing pages com animações de scroll de nível profissional (scrollytelling, parallax, pinned sections, scrub, reveals, marquee, botões magnéticos) escolhendo a stack certa — CSS Scroll-driven Animations nativas, GSAP + ScrollTrigger + Lenis, ou Motion para React — com timing/easing calibrados e regras de performance. Use quando pedirem landing page animada, site com efeitos de scroll, scrollytelling, parallax, "site estilo Awwwards", ou para recriar animações capturadas pelo SFX Clone.
---

# Scroll-driven sites

## Escolha de stack (decida ANTES de escrever código)

| Situação | Stack |
|---|---|
| Reveal, parallax leve, barra de progresso | CSS puro: `animation-timeline: view()/scroll()` + fallback `@supports` |
| Pinning, scrub complexo, scroll horizontal, timelines encadeadas | GSAP 3 + ScrollTrigger + Lenis |
| Projeto React | Motion (`useScroll`/`useTransform`) + Lenis |
| Fundo/distorção "premiada" | Three.js / shaders — ver [REFERENCE.md](REFERENCE.md) §4 |

Prefira sempre o nível mais baixo que resolve: CSS nativo primeiro, JS só quando o efeito exige.

## Os números (o "tateado" que separa amador de profissional)

- **Durações**: hover 100–150ms · press 80–100ms · entrada 300–600ms · saída sempre MAIS CURTA que a entrada · transição de página 400–700ms.
- **Stagger** entre irmãos: 30–100ms (80ms é o sweet spot para headlines).
- **Easing**: nunca `linear` — exceto em *scrub*, onde o scroll é o maestro (`ease: "none"`). Entradas: `power3.out`/`power4.out` ou `cubic-bezier(.22,1,.36,1)`. Interação tátil: spring físico.
- **Parallax**: fator 0.2–0.5. Parallax gritando é amadorismo.

## Regras de performance (inegociáveis)

1. Anime SÓ `transform` e `opacity`. Nunca `width`, `top`, `left`, `font-size` — forçam layout+paint por frame (jank).
2. `prefers-reduced-motion` desde o primeiro commit: desligar pin/parallax/scrub, manter reveals simples de opacity.
3. `will-change` com parcimônia (só nos elementos que de fato animam, removido depois).
4. Mobile: desativar seção horizontal e pins pesados; scroll normal.
5. Validação é SEMPRE manual: DevTools → Performance → rolar devagar → procurar flash vermelho de paint. IA não enxerga frames.

## Workflow

1. **Briefing técnico, nunca "animações bonitas"**: stack explícita, efeitos nomeados por termo técnico, física quantificada (duração/easing/range de cada animação). Template pronto em [REFERENCE.md](REFERENCE.md) §5.
2. **Esqueleto estático primeiro** (layout + conteúdo real), depois animação camada por camada — uma seção por vez.
3. **Itere como diretor**: "parallax do hero pra 0.5x", "stagger pra 120ms", "easing de entrada pra spring". Cada ajuste nomeia parâmetro + valor.
4. **Valide**: Performance tab sem jank, reduced-motion funcional, mobile com scroll normal, 60fps em máquina mediana.

## Integração com SFX Clone

Um bundle `scrollfx.bundle.js` capturado de um site de referência serve como **espec de timing**: os keyframes gravados (progresso 0–1 → transform/opacity) dizem exatamente quando e quanto cada elemento se move. Use-os para recriar o efeito de forma limpa na stack certa em vez de embutir o bundle em produção.

## Receitas completas

[REFERENCE.md](REFERENCE.md): §1 CSS scroll-timeline (reveal + seção pinada 300vh) · §2 GSAP + ScrollTrigger + Lenis (setup, hero stagger, scrub de texto, horizontal pinada) · §3 Motion/React (parallax sticky) · §4 WebGL/shaders · §5 template de briefing para IA · §6 vocabulário técnico · §7 os 10 componentes de treino.

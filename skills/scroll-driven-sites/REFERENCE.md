# Scroll-driven sites — receitas

## §1 CSS puro (Scroll-driven Animations API)

Suporte 2026: Chrome, Edge, Firefox, Safari 26+. Sempre embrulhe em `@supports (animation-timeline: view())` com fallback estático digno.

```css
/* Reveal ao entrar no viewport — zero JS */
.reveal {
  animation: reveal linear both;
  animation-timeline: view();              /* timeline = o elemento cruzando o viewport */
  animation-range: entry 0% entry 60%;     /* janelas: entry / exit / cover / contain */
}
@keyframes reveal {
  from { opacity: 0; transform: translateY(48px); }
  to   { opacity: 1; transform: none; }
}

/* Seção pinada: a página tem 300vh, o painel é sticky e o scroll "desenha" a animação */
.scene { height: 300vh; view-timeline: --roll; }
.panel {
  position: sticky; top: 0; height: 100vh; display: grid; place-items: center;
  animation: fly linear both;
  animation-timeline: --roll;               /* acompanha a seção, não o elemento */
  animation-range: cover 0% cover 100%;
}
@keyframes fly {
  0%   { opacity: 0; transform: translateY(60px) scale(0.98); }
  12%  { opacity: 1; transform: none; }
  88%  { opacity: 1; transform: none; }
  100% { opacity: 0; transform: translateY(-60px) scale(0.98); }
}

/* Reduced motion — obrigatório */
@media (prefers-reduced-motion: reduce) {
  .reveal, .panel { animation: none; }
}
```

## §2 GSAP 3 + ScrollTrigger + Lenis

O trio de 80% dos sites premiados. Lenis amortece o scroll nativo; GSAP dirige tudo em lockstep.

```js
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({ lerp: 0.1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

// Entrada do hero: linhas sobem escalonadas
gsap.from(".hero [data-reveal]", {
  y: 60, opacity: 0, stagger: 0.08, duration: 0.9, ease: "power3.out",
});

// Palavras "pintam" de 10% → 100% de opacidade ligadas ao scroll (scrub)
gsap.to(".statement .word", {
  opacity: 1, ease: "none", stagger: 0.05,
  scrollTrigger: { trigger: ".statement", start: "top 75%", end: "bottom 35%", scrub: true },
});

// Scroll vertical vira horizontal: a seção é pinada e o track desliza
const track = document.querySelector(".track");
gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: "none",                            // em scrub, o scroll é o maestro
  scrollTrigger: {
    trigger: ".horizontal",
    start: "top top",
    end: () => "+=" + (track.scrollWidth - innerWidth),
    pin: true,
    scrub: 1,                              // ~1s de amortecimento seguindo o dedo
  },
});

// Reduced motion
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  lenis.destroy();
  ScrollTrigger.getAll().forEach((st) => st.kill());
}
```

## §3 React: Motion (ex-Framer Motion)

```jsx
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);       // parallax 0.35x
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);      // texto some

  return (
    <section ref={ref} className="relative h-[250vh]">
      <div className="sticky top-0 grid h-screen place-items-center overflow-hidden">
        <motion.img src="/hero.jpg" style={{ y }} className="h-full w-full object-cover" />
        <motion.h1 style={{ opacity }} className="absolute text-6xl font-bold">Título</motion.h1>
      </div>
    </section>
  );
}
```

## §4 O patamar "wow": WebGL

Fundos por fragment shader (por pixel na GPU — impossível em CSS):

```glsl
void main() {
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float d = length(uv - vec2(0.5));
  vec3 col = mix(vec3(0.95, 0.1, 0.3), vec3(0.1, 0.02, 0.2),
                 d * 1.8 + sin(uTime * 0.5) * 0.1);
  gl_FragColor = vec4(col, 1.0);
}
```

Na prática: canvas + Three.js (+ React Three Fiber/drei se React), distorção de imagem com shader, ou Rive/Spline para interatividade sem escrever shader.

## §5 Template de briefing (adapte e use)

```text
Crie uma landing page one-page em HTML/CSS/JS com Tailwind (CDN).
Stack obrigatória: Lenis (smooth scroll) + GSAP 3 + plugin ScrollTrigger.

Seções, nesta ordem:
1. HERO 100vh: headline revelada palavra a palavra (stagger 80ms, y: 60→0,
   ease power3.out); imagem de fundo com parallax a 0,3x a velocidade do
   scroll; título some gradualmente ao rolar (scrub).
2. MANIFESTO: seção pinada por 300vh enquanto palavras de 10%→100% de
   opacidade acompanham o scroll (scrub, ease none).
3. HORIZONTAL: 4 cards; o scroll vertical converte em movimento horizontal
   com pin da seção; cada card tem leve tilt (3D) no hover.
4. MARQUEE infinito de logos, duas linhas em direções opostas.
5. FOOTER com botões magnéticos (atraem o cursor dentro de 120px de raio).

Restrições: animar apenas transform e opacity; respeitar prefers-reduced-motion
(desligar pin/parallax, manter reveals simples); alvo 60fps, sem animar
propriedades de layout; totalmente responsivo (mobile: desativar o section
horizontal e usar scroll normal).

Entregue o código completo e funcional, e comente cada animação indicando
o que dispara ela e seus parâmetros (duração, easing, range).
```

Quando quiser menos código: "use Scroll-driven Animations do CSS (`animation-timeline: view()`) quando possível, com fallback JS".

## §6 Vocabulário técnico (para briefings e prompts)

*scrollytelling* · *pinned section* (`pin: true` / `position: sticky`) · *scrubbing* (progresso 1:1 com o scroll, reversível) · *parallax* (camadas a velocidades diferentes) · *stagger* (atraso escalonado) · *text mask reveal* · *magnetic button* · *custom cursor com lerp* · *marquee/infinite slider* · *view timeline* / *scroll timeline* / `animation-range` · *View Transitions API* (`document.startViewTransition`) · compositor thread / GPU compositing · layout thrashing · jank · `will-change` · `content-visibility: auto`.

## §7 Os 10 componentes de treino

1. Botão magnético · 2. Cursor custom com lerp · 3. Text split/stagger reveal · 4. Imagem com clip-path mask · 5. Marquee · 6. Preloader com contador · 7. Card tilt · 8. Carousel arrastável · 9. Transição de página (View Transitions) · 10. Contador numérico ligado ao scroll.

Método de estudo: abrir site premiado (Awwwards/FWA/Godly) → DevTools → Network → identificar `gsap`/`lenis`/`three` → clonar 1:1. O SFX Clone acelera isso capturando os keyframes reais do site de referência.

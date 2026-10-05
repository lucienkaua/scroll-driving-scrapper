# Chrome Web Store — materiais da listagem

## Nome
SFX Clone — Scroll Effects

## Descrição curta (máx. 132 caracteres)
Capture as animações de scroll de qualquer site e exporte um .js auto-contido para usar no seu projeto.

## Descrição detalhada
Aponte para um site de referência, clique em Capturar e receba um bundle .js pronto para colar no seu projeto — com as mesmas animações de rolagem.

COMO FUNCIONA
• Varredura inteligente: a extensão rola a página, descobre quais elementos animam com o scroll e grava keyframes (transform, opacity, filter, clip-path, background-position e pinning de seções).
• Bundle auto-contido: runtime de ~4 KB sem dependências + os keyframes capturados. Cole um <script> antes do </body> e pronto.
• Duração automática: a gravação escala com a altura da página (8–35 s), com opções manuais de 12/20/35 s.
• Seletores duráveis: classes hasheadas de bundlers (CSS Modules, styled-components…), classes de estado (is-inview, active…) e ids de runtime ficam fora — o bundle sobrevive a novos deploys do site de origem.
• CSS nativo: sites que usam Scroll-driven Animations (animation-timeline) podem ser extraídos como CSS puro.
• Detecção de stack: badges mostram as bibliotecas de animação da página (GSAP, ScrollTrigger, Lenis, AOS, Three.js…).

QUALIDADE MEDIDA
Validada por harness automatizado em 7 paradigmas (CSS nativo, Lenis, GSAP/ScrollTrigger, Apple, AOS, Motion/React, Locomotive). Metodologia e notas: github.com/lucienkaua/scroll-driving-scrapper

PRIVACIDADE
Nenhum dado é coletado. Nada roda em segundo plano: o capturador só é injetado na aba ativa quando você clica no ícone, e o bundle gerado fica somente no seu computador.

LIMITAÇÕES HONESTAS
Animações disparadas por tempo (IntersectionObserver + duração fixa) são aproximadas; conteúdo desenhado em canvas/WebGL não é alcançável por estilos computados.

Código aberto: github.com/lucienkaua/scroll-driving-scrapper
Desenvolvido por lucienkaua

## Categoria
Ferramentas para desenvolvedores (Developer Tools)

## Idioma
Português (Brasil)

## Campos do painel de privacidade (Privacy practices)

**Finalidade única (single purpose):**
Capturar as animações de rolagem da página ativa e exportá-las como um arquivo .js reutilizável, a pedido do usuário.

**Justificativa — activeTab:**
Necessária para acessar a aba ativa somente quando o usuário clica no ícone da extensão, a fim de capturar os estilos computados dos elementos animados daquela página.

**Justificativa — scripting:**
Necessária para injetar o script de captura (content/content.js) na aba ativa sob demanda. Não há content script declarativo: nada é executado em nenhuma página sem o clique do usuário.

**Uso de dados:** a extensão não coleta, não transmite e não armazena dados do usuário ou de navegação. Nenhuma requisição de rede é feita a serviços externos.

**URL da política de privacidade:**
https://github.com/lucienkaua/scroll-driving-scrapper/blob/main/store/privacy-policy.md

## Assets (todos JPEG — o formulário exige 24 bits sem alfa)
- Screenshots 1280×800: `store/screenshots/01-hero.jpg`, `store/screenshots/02-fluxo.jpg`
- Bloco promocional pequeno 440×280: `store/promo-small-440x280.jpg`
- Bloco promocional de letreiro 1400×560: `store/promo-marquee-1400x560.jpg`
- Ícone da loja 128×128: `icons/icon128.png`
- Zip de distribuição: gerar com `powershell -File tools/make-store-zip.ps1` → `store/sfx-clone-<versão>.zip`
- Regenerar imagens: `node tools/shot-popup.mjs && node tools/make-store-assets.mjs`

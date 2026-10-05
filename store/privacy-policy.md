# Política de Privacidade — SFX Clone (Scroll Effects)

Última atualização: 2026-10-05

## Resumo

O SFX Clone **não coleta, não transmite e não armazena** nenhum dado pessoal ou de navegação. Ponto.

## Detalhes

- **Nenhum dado é coletado.** A extensão não possui analytics, telemetria, contas ou qualquer comunicação com servidores — ela não faz nenhuma requisição de rede a serviços externos.
- **Nada roda em segundo plano.** Não há content script declarativo nem service worker persistente. O script de captura só é injetado na aba ativa, no momento em que você clica no ícone da extensão (permissões `activeTab` + `scripting`).
- **Todo o processamento é local.** A captura lê estilos computados da página ativa e gera um arquivo `.js` dentro do popup; copiar ou baixar esse arquivo é uma ação sua, e o conteúdo permanece apenas no seu computador.
- **Permissões utilizadas:** `activeTab` (acesso à aba ativa somente após o clique) e `scripting` (injeção do capturador sob demanda). Nenhuma outra.

## Código aberto

O código-fonte completo pode ser auditado em:
https://github.com/lucienkaua/scroll-driving-scrapper

## Contato

Dúvidas sobre esta política: abra uma issue em
https://github.com/lucienkaua/scroll-driving-scrapper/issues

---

# Privacy Policy — SFX Clone (Scroll Effects) [English]

SFX Clone does **not collect, transmit or store** any personal or browsing data. There are no analytics, no telemetry, no accounts and no network requests to external services. Nothing runs in the background: the capture script is only injected into the active tab when you click the extension icon (`activeTab` + `scripting` permissions). All processing is local; the generated `.js` bundle stays on your computer. Full source code: https://github.com/lucienkaua/scroll-driving-scrapper

# /techstone como apresentação: seções que tocam sozinhas

Data: 13/11/2026 · Pedido do dono · Branch `techstone-apple`

## Por quê

Hoje a página parece pesada. Quase tudo anda pela rolagem: são umas 25 telas presas (abertura 5,6, sequência de usos 6,8, Amazônia 6 e dois tamanhos 4,4). Quando o dono apresenta para um cliente, a página parece não acabar. O dono quer o clima de um site da Apple, limpo, fluido e curto. Cada momento ocupa uma tela, a página se encaixa nele e a animação toca sozinha, como um vídeo. E, como no PFB, um botão leva direto ao catálogo dos modelos.

## Objetivos

- As quatro seções de quadro preso passam a tocar sozinhas: abertura, sequência de usos, "Desenvolvida para a Amazônia." e "Dois tamanhos.". Cada uma ocupa uma tela.
- Encaixe firme: cada seção de tela cheia se encaixa ao chegar e a animação toca.
- Página própria de catálogo, `/techstone/catalogo`, com os 12 modelos, o filtro de tamanho, a textura para baixar e o "Tenho interesse". A grade sai da página principal.
- A página principal cai de umas 25 telas para umas 9 a 11.

## Fora do escopo

- Mudar textos aprovados, fotos e cenas. Entram só os microtextos novos: o botão do catálogo, a abertura da página do catálogo e os rótulos de pausar e tocar de novo.
- Mexer nas ideias em tela cheia (`IdeiaAmpliada`, f43b778). Elas ficam como estão.
- Vídeos MP4 ou biblioteca nova de animação.

## O que não pode acontecer

- Animação que não para, ou sem botão de pausa: animação com mais de 5 segundos precisa de pausa.
- Prender o cliente: rolar durante a animação precisa funcionar sempre e levar à próxima seção.
- A página ficar presa entre seções, ou o rodapé ficar inalcançável por causa do encaixe.
- Regressão no celular de 390 px, no "reduzir movimento" ou na página sem JavaScript.

## Formas de construir

| | Como | Troca |
|---|---|---|
| **A, escolhida** | Um tocador (`useToque`) escreve o mesmo `--p` de 0 a 1 que hoje vem da rolagem, além de `data-ativo` e `data-p10`, só que pelo relógio, em N segundos, quando a seção encaixa. O CSS e o JS que leem `--p` não mudam. | Reaproveita toda a coreografia já ajustada. A troca é de motor. |
| B | Refazer as animações em anime.js. | Liberdade total, mas joga fora um trabalho bom e tem mais risco. |
| C | Renderizar MP4. | Pesa no celular, o texto vira imagem e cada mudança exige render. |

O dono deixou o "como" comigo. Escolhi a A.

## Desenho

**Ordem da página (cada linha é um ponto de encaixe):**
1. Abertura: tela cheia, toca em cerca de 7 s. O nome aparece, as três frases passam e termina em "Chega em breve a Manaus." com dois botões, "Entrar na lista de espera" e "Ver os modelos" (para `/techstone/catalogo`).
2. O que é a TechStone: estática, como hoje.
3. Sequência de usos: tela cheia, toca em cerca de 14 s (4 quadros de 3,5 s) e para em "Pedra e madeira.". As marcas do trilho viram botões para ir a cada quadro.
4. Uma curva só: estática.
5. Desenvolvida para a Amazônia: tela cheia, toca em cerca de 10 s e termina com as quatro preocupações lado a lado.
6. Ideias para o seu projeto: como hoje. O "ver tamanho" passa a abrir `/techstone/catalogo?tamanho=…`.
7. Dois tamanhos: tela cheia, toca em cerca de 9 s e termina na placa grande. Embaixo, um botão "Ver os 12 modelos" (para o catálogo). A grade sai daqui.
8. Lista de espera, depois Perguntas e o rodapé: rolagem livre.

**Tocador (`useToque`):**
- Começa quando pelo menos 60% da seção está na tela e a rolagem parou (`scrollend`, com uma reserva por tempo). Escreve `--p` pelo relógio compartilhado (`relogio`), com uma curva de tempo `ease-in-out` por etapa, porque o CSS já distribui as etapas.
- Volta para `--p = 0` quando a seção sai da tela, para tocar de novo na próxima chegada.
- Botão de pausar e tocar de novo no canto inferior esquerdo (o canto direito é do chat), com `aria-label` e `:focus-visible`. Quando termina, ele vira "tocar de novo".
- Com movimento reduzido, `--p = 1` direto e sem botão. Sem JavaScript, valem os layouts estáticos que já existem (`CSS_SEM_JS`).

**Encaixe:** `scroll-snap-type: y mandatory` no `html`, só na /techstone (classe posta no mount e retirada no unmount), com `scroll-padding-top: 0`, porque o cabeçalho já se recolhe ao descer. Cada seção recebe `scroll-snap-align: start`. As seções livres mais altas que a tela também são pontos de encaixe, e o navegador deixa rolar dentro delas. O rodapé recebe `scroll-snap-align: end`. Se o WebKit ou o celular se comportarem mal no teste, o fallback é `proximity` só no celular, e eu aviso o dono.

**Catálogo (`/techstone/catalogo`):** cabeçalho curto ("Catálogo TechStone" e uma frase), abas Todos / 1200 × 600 / 2400 × 1200 (lidas de `?tamanho=`), a grade atual (`Grade`/`ModelosDoTamanho` saem de `Tamanhos.tsx` para um arquivo próprio) e a folha da lista de espera. Leva metadata, breadcrumb, entrada no sitemap e link de volta para /techstone.

## Restrições e portões

- Textos novos passam por `orbital-marca` e pelo `humanizer`: sem citar concorrentes e sem dizer que a Orbital instala.
- Hallmark usado como auditoria (o dono a nomeou): `sloplint --render --url` na página e no catálogo, com correção do que for desta mudança. A marca (Noto Serif e Inter, a paleta) fica. O selo de CSS da Hallmark não entra no `globals.css` compartilhado.
- Antes do push: `npm run lint`, `tsc` e `build`. Playwright a 390 px e 1440 px, com reduced-motion, em Chromium. A ideia em tela cheia precisa continuar abrindo. Depois do push: `esperar-deploy.sh`.

## Decidido pelo dono

Catálogo em página própria. As quatro seções tocam sozinhas. Encaixe firme.

## Decidido por mim (pode mudar)

Duração de cada seção. Tocar de novo a cada chegada. Botão no canto esquerdo. A sequência para no último quadro, sem repetir em loop. O fallback de encaixe no celular.

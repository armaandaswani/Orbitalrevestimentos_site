# Página do PFB como experiência: desenho

Data: 07/11/2026 · Branch: `pfb-experiencia` (a partir de `origin/main` 1ca8099) · Worktree: `/Users/armaandaswani/orbital-pfb-e2`

## Por que

A página `/produtos/pfb` publicada em 07/11/2026 (merge f62f8c7) substituiu a antiga `/tecnologia`. O dono achou o resultado "muito feio e sem vida, especialmente no mobile": a página virou blocos de texto com fotos pequenas, a anatomia da placa virou um desenho genérico em SVG, e quase tudo o que a Tecnologia mostrava sumiu (selos com ícones, leque de acabamentos, imagem da anatomia, teste de água, clima de Manaus, impacto ambiental, notas de instalação). Ele quer a página da Tecnologia de volta dentro do PFB, porque ela explica o que é o produto, feita como uma experiência: clean, elegante, minimalista e luxuosa, no padrão da marca.

Prints de comparação no celular (390 × 844), tela por tela: `~/orbital-movimento/.superpowers/checks/saida/comparar/folha-antiga.png` (Tecnologia, 13 telas) e `folha-nova.png` (PFB publicada, 14 telas).

## Decisões do dono (07/11/2026)

| # | Decisão |
|---|---|
| D1 | Direção: **capítulos de tela cheia**. Cada bloco ocupa uma tela, com uma imagem grande, uma frase, muito respiro, fundo creme alternando com azul-noite. Movimento especial só em dois momentos: o leque de acabamentos abre e as lâminas da placa se afastam. |
| D2 | **Teste de água volta como era**: as três fotos 0h, 24h e 48h com o PFB ao lado do MDF, **sem a marca do Gemini** no canto. O dono liberou explicitamente essa comparação (exceção à regra "sem outros materiais", só para estas fotos). Pode-se tentar deixá-las mais realistas; se não ficar melhor, ficam as originais limpas. |
| D3 | **Anatomia sem rótulos**: a imagem `product-anatomy.png` volta com o texto apagado; ao lado, os 5 nomes já aprovados (decisão E-4 de 06/11). As duas lâminas de PVC coextrusado da imagem contam juntas como "Camada de PVC". |
| D4 | A tabela "PFB vs. concorrentes" (10 critérios) **não volta** (regra da marca; o dono não pediu). |
| D5 | Densidade: 550 kg/m³ é só do substrato de fibra de bambu (já no ar, d679c96). |

## Regras que continuam valendo (fonte: Manual da marca, `orbital-marca`, decisões de 06/11, aprendizados do `web-design-mestre`)

- Noto Serif nos títulos, Inter no texto; cores do manual (`#0B1F45`, `#0D1830`, `#2347A0`, `#36A35C`, `#1F7A44`, `#F6F5F2`, `#43474e`, `#74777f`). "Um fundo, uma tinta, um destaque": verde só na ação.
- Cantos retos; sem gradiente, sem sombra em coisa parada, sem rótulo-sobrancelha em caixa alta repetido, sem contador decorativo de seção, sem ícone genérico (só os selos da marca em `public/images/selos/`).
- **Cada capítulo cabe numa tela** em 390 × 844 e 1440 × 900; nenhum pede 2 ou 3 rolagens; **nada preso na tela enquanto o conteúdo troca** (sem `position: sticky` de cena, sem pin).
- Animação só com `transform` e `opacity`; `prefers-reduced-motion` mostra tudo parado e visível; o nível de movimento (`SCRIPT_NIVEL`, `lib/movimento/nivel`) continua valendo.
- Copy: sem travessão, sem preço, nunca "mais caro", "Painel Flexível em Fibra de Bambu (PFB)" por extenso na primeira menção, a Orbital é fornecedora e não instala, 0,2% em 48 h é **absorção** (não inchamento), não há laudo de fogo ("não propaga chamas" e nada além), teto e forro sempre com fixação mecânica. Todo texto novo passa por `humanizer` e `orbital-marca`.
- Sem rolagem lateral em nenhuma largura (o trilho de fotos do capítulo 6 rola dentro de si, com `overflow-x: auto` e encaixe, e o `scrollWidth` da página continua igual à janela).

## A página, capítulo por capítulo

Ordem igual no celular e no computador. "Tela" = altura útil da janela; no celular o capítulo pode ter `min-height: 100svh` quando a imagem é o assunto, e altura natural quando é texto curto, mas nunca mais que uma tela de conteúdo.

| # | Capítulo | Conteúdo | Imagem e movimento | Fundo |
|---|---|---|---|---|
| 1 | Abertura | Título "Painel Flexível em Fibra de Bambu (PFB)"; `ABERTURA.lead`; `ABERTURA.estoque`; botões "Ver os modelos" e "Falar com um consultor" | Foto da escada (`/images/projetos/escada-madeira-pfb-2026-10*`, a mesma de hoje) **em tela cheia**, texto sobre um véu sólido (sem gradiente: faixa de `#0B1F45` com opacidade) ou abaixo da foto no celular, o que ler melhor no print. Parallax leve da foto. | foto |
| 2 | O que é | Uma frase (a de `ConhecaPfb`: revestimento de fibra de bambu renovável para paredes e tetos internos, leve, flexível, pensado para o clima de Manaus) + os 6 selos com os ícones da marca (`PFB_SELOS` do antigo `ConhecaPfb`: título e linha de apoio) + medidas numa linha (1,20 × 2,90 m · 5 mm · 3,48 m² · parede e forro) | Grade 2 × 3 no celular, 6 em linha no computador, **sem caixas nem bordas**, só ícone, nome e apoio; revelar escalonado | creme |
| 3 | Acabamentos | "Classic · Brilliance · Elegance" e "Ver os modelos" | O leque de 5 amostras do antigo `ConhecaPfb` (mesmas imagens), maior; **abre quando entra na tela** (as amostras partem empilhadas e giram até o ângulo final, só `transform`) | branco |
| 4 | A placa por dentro | `CAMADAS.titulo`, `CAMADAS.lead`, os 5 `CAMADAS.nomes`, `CAMADAS.legenda` | `product-anatomy.png` **sem rótulos** (D3). As lâminas se afastam um pouco ao entrar na tela: a mesma imagem repetida em 6 cópias recortadas por `clip-path: polygon(...)` (uma por lâmina, recortes pelos vãos brancos), cada cópia com `translateY` próprio; os 5 nomes surgem um a um, alinhados à altura da sua lâmina (as duas de PVC dividem o nome "Camada de PVC"). Se o recorte não ficar limpo no print, cai para a imagem inteira com revelar `desvela` e os nomes escalonados (decisão do executor, registrada no ledger). | creme |
| 5 | Números | Os 5 números da antiga Tecnologia, em serif grande, com contagem na entrada (`AnimatedStat`): 72,3 MPa (resistência à flexão), 0,2% (absorção de água em 48 h), 550 kg/m³ (densidade do substrato de fibra de bambu), 3,2 kg/m² (peso; cerca de 11 kg por placa), 0,5% (teor de umidade); a ressalva da impermeabilização (`FICHA.selos[0].ressalva`); a ART e a ficha detalhada em acordeão (os antigos `ARTAccordion` e `FichaTecnicaAccordion`, revistos pela copy acima); Durabilidade e Garantia (`FICHA.durabilidade`, `FICHA.garantia`) dentro da ficha detalhada; botão "Solicitar manual" (`SolicitarManual`). A tolerância ±10% de peso e densidade **só volta se estiver no vault**; se não estiver, fica de fora e vai para Perguntas abertas. | Sem imagem; números em grade 2 colunas no celular, 5 em linha no computador; linha fina `#2347A0` à esquerda de cada número (como antes) | azul-noite |
| 6 | Teste de água | Título curto e uma frase: placa submersa por 48 horas, 0,2% de absorção. As três legendas 0h, 24h, 48h (curtas). **Não dizer "em laboratório"** junto das fotos: elas são ilustração (D2); a frase do número diz "no ensaio". | As 3 fotos (D2), retrato. Celular: trilho horizontal com `scroll-snap`, uma foto e meia à vista, marcador 0h/24h/48h; computador: as três lado a lado em 75% da largura. Revelar `desvela` no bloco. | azul-noite |
| 7 | Feito para Manaus | Título "Pensado para o clima de Manaus" (palavra do `orbital-marca`); 4 pontos curtos com fonte no vault: resistente a mofo; resistente a cupim; absorção de 0,2% em 48 h e teor de umidade de 0,5%; durabilidade esperada de 10 anos ou mais. **Fora** (sem fonte no vault): "umidade relativa acima de 80%", "não mofará mesmo sem ventilação", "ciclos de –10 °C a +120 °C". O limite de calor (acima de 50 °C contínuo) já está em "Onde não usar". | Foto real grande de obra úmida/ambiente (escolher entre as fotos de obra já no repo, preferindo banheiro ou cozinha; nada de imagem genérica). Sem ícones genéricos. | branco |
| 8 | Opinião do instalador | Título da antiga Tecnologia ("Um serviço rápido. Sobra tempo para mais obras."), a frase sobre o Adam, da Werk Engenharia, e os 4 pontos (Aplicação, Manuseio, Corte, Acabamento), sem travessão | `VideoShort` (id `hpgoCY8L2PI`, pôster `opiniao-instalador-adam-werk.jpg`) **grande**: no celular, largura quase toda | creme |
| 9 | Três linhas | `LINHAS.titulo`, `LINHAS.lead`, por linha a frase de `LINHAS_PFB` e duas fotos de modelos (`lerModelosPorLinha(2)`, como hoje), link `LINHAS.verModelos(linha)`; `LINHAS.aviso` em letra pequena | Fotos maiores que hoje; no celular as duas fotos de cada linha lado a lado ocupando a largura | branco |
| 10 | Serve para o meu projeto? | `SERVE.titulo`; "Onde usar" e "Onde não usar" em **dois blocos que abrem ao tocar** (`details`/`summary` ou o padrão de acordeão do site), cada um com uma linha de resumo visível fechado | Sem imagem | creme |
| 11 | Bambu | Título da antiga Tecnologia ("Bambu cresce em meses. Uma árvore leva décadas.") **só se** a frase passar no `revisor-tecnico` como fato de domínio público (crescimento do bambu); 3 pontos com fonte: fibra de bambu renovável, sem formaldeído, leve (cerca de 11 kg por placa). **Fora**: "inodoro", "não emite VOCs", "substrato biodegradável", "seguro para clínicas e hospitais" (sem fonte no vault). | `onde-aplicar-main.jpeg` grande (parallax leve) | branco |
| 12 | Instalação e pedido | Notas de instalação em 4 linhas, todas do vault (`Instalação`, `Perfis de alumínio`): base firme, seca, limpa e plana, com teste a seco; parede com cola PU de alta aderência, de 2 a 3 horas por cômodo; teto e forro sempre com fixação mecânica (cola e parafusos, perfis ou malha híbrida), com cola de contato e espuma expansiva; acabamento de bordas e cantos com perfis de alumínio. Depois `SERVE.comoAplicar.antesDoManual` + link do manual. Depois `PEDIR` (frase dos showrooms, a grade de lugares que já existe em `FechamentoPfb`, orçamento e botões). **Fora**: "junta de dilatação a cada 3 m", "irregularidade acima de 2 mm" (sem fonte). | Fotos dos lugares (como hoje) | creme → azul-noite no rodapé |

Textos: os valores exatos ficam em `src/lib/pfb-textos.ts` (o arquivo continua a fonte única da copy da página, com o comentário `// fonte:` em cada frase). Frases novas ou trazidas da Tecnologia entram lá, reescritas por estas regras e passadas no `humanizer` e no `orbital-marca`.

## Imagens

| Imagem | De onde | O que fazer |
|---|---|---|
| Teste de água 0h, 24h, 48h | `git show f62f8c7^1:public/images/catalogue/pfb-mdf-{0h,24h,48h}.png` (1536 × 2752, ~8 MB cada) | Tirar a marca do Gemini (canto inferior direito) preenchendo com a textura vizinha; exportar em JPEG ou WebP de até ~400 KB cada, nome novo `pfb-teste-agua-{0h,24h,48h}.jpg`. Tentativa de realismo (opcional, D2): só ajuste de cor, grão e nitidez local; nada de gerar imagem nova. |
| Anatomia | `public/images/catalogue/product-anatomy.png` (732 × 1638) | Apagar os rótulos e as linhas-guia (fundo branco), salvar como `pfb-anatomia-sem-rotulos.png`; medir os vãos entre as lâminas para os recortes do capítulo 4. |
| Selos | `public/images/selos/pfb-icone-*.svg` | Usar como estão. |
| Leque | as 5 amostras de `ConhecaPfb` em `public/images/catalogue/` | Usar como estão. |
| Clima e bambu | fotos de obra do repo; `onde-aplicar-main.jpeg` | Escolher no print; registrar a escolha no ledger. |
| Vídeo | pôster `public/images/videos/opiniao-instalador-adam-werk.jpg` | Como está. |

Peso: cada imagem com `next/image`, `sizes` correto e `loading` padrão (lazy) fora da primeira tela; a foto da abertura com `priority`.

## Arquitetura

- `src/app/produtos/pfb/page.tsx` continua o servidor (metadata, schemas, `lerModelosPorLinha`, `carregarLugares`) e compõe 12 componentes de capítulo em `src/components/pfb/` (um arquivo por capítulo; os que já existem são reescritos: `AberturaPfb`, `CamadasPfb`, `FichaPfb`, `LinhasPfb`, `ServePfb`, `FechamentoPfb`; novos: `SelosPfb`, `LequePfb`, `AguaPfb`, `ManausPfb`, `InstaladorPfb`, `BambuPfb`). `PlacaEmEscala` sai (não está no desenho).
- Movimento reaproveita `Revelar` (`efeito` sobe, desvela, surge; `ordem`) e o CSS de `globals.css`. O leque e as lâminas usam animações de entrada por CSS disparadas pelo mesmo estado de `Revelar` (classe quando entra na tela), sem biblioteca nova. O bloco "PFB: a placa por dentro" do `globals.css` e `lib/movimento/camadas.ts` (+ teste) são trocados pelo novo mecanismo ou removidos.
- `ConhecaPfb.tsx` (só `DiferenciaisPfb`, usado na Academia) fica como está; `PFB_SELOS` passa a morar num módulo de dados compartilhado se os dois precisarem.
- `ARTAccordion` e `FichaTecnicaAccordion` voltam do histórico (`git show f62f8c7^1:src/components/...`) para `src/components/pfb/`, com a copy revista.
- `scripts/verificar-pfb.mjs --etapa 2` hoje confere a estrutura da página publicada (885 linhas novas na E2/3). As verificações que dependem das seções antigas são atualizadas para os 12 capítulos; as de SEO, schemas, redirecionamentos, links, eventos do funil (`consultor_clicado`, `manual_solicitado`) e "sem rolagem lateral" continuam iguais.
- Sem dependência nova.

## Verificação

1. `npx tsc --noEmit`, `npm run lint` (sem erro novo em relação à main), os testes `node --test` que existirem.
2. `node scripts/verificar-pfb.mjs --etapa 2` local, contra o mock em 127.0.0.1:54329, 100% ok.
3. Portão de movimento `scripts/medir-movimento.mjs` em `/produtos/pfb`: `acima33 = 0` (o artefato conhecido do ipad-mini em altura útil 4199–4200 px não conta), CLS < 0,05, `scrollWidth ≤ janela`.
4. Prints tela a tela em 390 × 844, 768 × 1024 e 1440 × 900 (`.superpowers/checks/telas-celular.mjs` e equivalente para as outras larguras), com a folha de contato; cada capítulo cabe numa tela; reduced-motion mostra tudo.
5. `qa-revisor` e `revisor-tecnico` (números e fatos) antes dos prints irem ao dono.
6. Publicar só com o OK do dono depois dos prints.

## Perguntas abertas (não bloqueiam)

- Tolerância de ±10% em peso e densidade: está no vault? Se não, fica de fora até o dono confirmar.
- Ensaio de ciclos térmicos (–10 °C a +120 °C), juntas de dilatação a cada 3 m, irregularidade máxima de 2 mm da base: fatos da antiga Tecnologia sem fonte no vault; ficam de fora até o dono confirmar.
- Renomear o vídeo no YouTube Studio (com o dono).

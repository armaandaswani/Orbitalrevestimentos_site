# Página do PFB como experiência: desenho (v2)

Data: 07/11/2026 · Branch: `pfb-experiencia` (a partir de `origin/main` 1ca8099) · Worktree: `/Users/armaandaswani/orbital-pfb-e2` · Ledger: `.superpowers/sdd/2026-11-07-pfb-experiencia/progress.md`

v2 aplica as duas revisões Goldfish (`.superpowers/sdd/2026-11-07-pfb-experiencia/goldfish-spec-readiness.md` e `goldfish-spec-design.md`); o registro de cada achado está no fim.

## Por que

A página `/produtos/pfb` publicada em 07/11/2026 (merge f62f8c7) substituiu a antiga `/tecnologia`. O dono achou o resultado "muito feio e sem vida, especialmente no mobile": blocos de texto com fotos pequenas, a anatomia virou um desenho genérico em SVG, e quase tudo o que a Tecnologia mostrava sumiu. Ele quer a Tecnologia de volta dentro do PFB, porque ela explica o que é o produto, feita como uma experiência: clean, elegante, minimalista e luxuosa, no padrão da marca.

Prints de comparação no celular (390 × 844): `~/orbital-movimento/.superpowers/checks/saida/comparar/folha-antiga.png` (Tecnologia) e `folha-nova.png` (PFB publicada).

## Decisões do dono (07/11/2026)

| # | Decisão |
|---|---|
| D1 | Direção: **capítulos de tela cheia**. Cada bloco ocupa uma tela, com uma imagem grande, uma frase, muito respiro, fundo creme alternando com azul-noite. Movimento especial só em dois momentos: o leque de acabamentos abre e as lâminas da placa se encaixam. |
| D2 | **Teste de água volta como era**: as três fotos 0h, 24h e 48h com o PFB ao lado do MDF, **sem a marca do Gemini**. O dono liberou essa comparação só para estas fotos. |
| D3 | **Anatomia sem rótulos**: `product-anatomy.png` com o texto apagado; ao lado, os 5 nomes aprovados em 06/11 (as duas lâminas de PVC contam como "Camada de PVC"). |
| D4 | A tabela "PFB vs. concorrentes" **não volta**. |
| D5 | 550 kg/m³ é a densidade do substrato de fibra de bambu (no ar, d679c96). |

## Regras

- Marca (Manual da marca, `orbital-marca`): Noto Serif nos títulos, Inter no texto; cores `#0B1F45`, `#0D1830`, `#2347A0`, `#36A35C`, `#1F7A44`, `#F6F5F2`, `#43474e`, `#74777f`. Campos de fundo: **creme `#F6F5F2`, azul-noite `#0B1F45` e foto inteira**; branco `#FFFFFF` não é campo de capítulo. Verde só na ação.
- Cantos retos; sem gradiente; sem sombra em coisa parada; sem rótulo-sobrancelha em caixa alta; sem contador decorativo; sem ícone genérico (só os selos em `public/images/selos/`); sem ícone dentro de quadrado tingido.
- **Orçamento de altura**: cada capítulo tem no máximo **680 px** de altura em 390 px de largura (iPhone real com as barras do Safari) e no máximo **820 px** em 1440 × 900. O capítulo 1 tem exatamente `calc(100svh - 5rem)`. Nada preso na tela (sem `position: sticky` de cena, sem pin).
- Uma frase por lugar: cada fato aparece num capítulo só (ver "Um lugar por fato"). No máximo um botão primário por capítulo; o resto é link de texto.
- Movimento: só `transform` e `opacity`. `Revelar` (sobe, desvela, surge) e o parallax leve são a **entrada comum** da página; os **dois momentos especiais** do D1 são o leque (capítulo 7) e as lâminas (capítulo 3). Sem contagem de números. Com `prefers-reduced-motion: reduce`, sem JavaScript ou no nível `leve` (`SCRIPT_NIVEL`), tudo aparece no estado final, parado.
- Área livre de 88 × 88 px no canto inferior direito dos capítulos de foto inteira (1, 6 e 10): o botão do chat (`ChatWidget`, `fixed bottom-6 right-6`) fica ali.
- Copy: sem travessão (— nem –), sem preço, nunca "mais caro", "Painel Flexível em Fibra de Bambu (PFB)" por extenso na primeira menção, a Orbital fornece e não instala, 0,2% em 48 h é **absorção**, não há laudo de fogo ("não propaga chamas" e nada além), teto e forro sempre com fixação mecânica, sem "UV", sem "estrutural", sem "impermeável", sem ±10%. Todo texto deste documento já passou pelo `humanizer` e pelo `orbital-marca`; muda só com nova passada.
- Sem rolagem lateral em nenhuma largura: `documentElement.scrollWidth ≤ innerWidth` sempre, inclusive no meio da animação do leque.
- Next 16.2.4: na imagem da primeira tela, `preload` (não `priority`). Toda `Image fill` dentro de caixa com proporção fixa (CLS 0). Fonte nova de imagem com no máximo 2400 px no lado maior e ~500 KB.

## Escala

| | Celular (390) | Computador (1440) |
|---|---|---|
| h1 | Noto Serif 30/34 | 56/62 |
| Título de capítulo (t1) | 26/31, até 2 linhas | 40/46 |
| Frase de efeito (t2) | 22/26, até 3 linhas | 30/36 |
| Nome (t3) | Noto Serif 17/22 | 20/26 |
| Corpo | Inter 16/26 | 17/28, até 60 caracteres por linha |
| Legenda | Inter 14/20 | 14/20 |
| Número de destaque | Noto Serif 48/52 | 64/68 |
| Número | Noto Serif 32/36 | 44/48 |
| Respiro do capítulo | 48 px em cima e embaixo | 96 px |
| Título → conteúdo | 24 px | 32 px |
| Margem lateral | 16 px | `ds-wrap` |
| Botão | 44 px de alto | 48 px |

Números com `font-variant-numeric: tabular-nums`. Itálico da Noto Serif só na segunda linha do título do capítulo 10.

## A página, capítulo por capítulo

Ordem igual no celular e no computador. A coluna "id" é o `id` da `section` (e `data-capitulo` com o mesmo valor); `aria-labelledby` aponta para o título.

| # | id | Campo | Conteúdo (chaves de `pfb-textos.ts`) | Imagem, layout e movimento |
|---|---|---|---|---|
| 1 | `abertura` | foto + painel | `ABERTURA.titulo`, `ABERTURA.lead`, `ABERTURA.estoque` (legenda), botão primário `ABERTURA.botaoModelos` → catálogo, link de texto `ABERTURA.botaoConsultor` (`ContatoCta origem="pfb-abertura"`, como hoje) | **Celular:** quadro de `calc(100svh - 5rem)`; foto `escada-madeira-pfb-2026-10.jpg` nos 56% de cima, `object-position: 62% 50%`, parallax de até 24 px só na foto (só no nível completo; hoje `globals.css:1429` deixa a foto parada abaixo do lg: muda e o portão mede); painel creme nos 44% de baixo com o texto. **Computador:** foto em tela cheia, `object-position: 50% 45%`, texto num painel sólido `#0B1F45` (opacidade 1) de 40% da largura à esquerda. Sem véu translúcido. `preload`. |
| 2 | `o-que-e` | creme | `O_QUE_E.frase` (t2) + `SELOS` (6, ícone e nome) + `O_QUE_E.medidas` (legenda) | Selos em grade 3 × 2 no celular, 6 em linha no computador; ícone solto de 32 px (40 no computador), nome em t3 a 8 px abaixo, sem caixa, sem borda. `Revelar sobe` escalonado. Silêncio antes do pico. |
| 3 | `tecnologia` | creme | `CAMADAS.titulo`, `CAMADAS.lead`, os 5 `CAMADAS.nomes` (sai `CAMADAS.legenda`) | **Pico da página.** `pfb-anatomia-sem-rotulos.png` (fundo transparente, recortada à pilha). Celular: imagem à direita em 58% da largura, nomes à esquerda em t3, cada nome alinhado à altura da sua lâmina (as lâminas 4 e 5 dividem "Camada de PVC"); computador: imagem com 600 px de altura e nomes ao lado com uma linha fina de 1 px até a lâmina. Movimento: a imagem é desenhada por 6 cópias recortadas por `clip-path: polygon(...)` pela **linha de oclusão** (borda de baixo da lâmina de cima), `z-index` decrescente de cima para baixo; as cópias **partem encaixadas** (cada uma deslocada para cima até `fechadoY`, escondida atrás da de cima) e **terminam na posição da imagem**: o quadro final é a imagem original. Polígonos e `fechadoY` em `.superpowers/sdd/2026-11-07-pfb-experiencia/imagens/pfb-anatomia-recortes.json`, copiados para `src/lib/pfb-anatomia.ts`. Os nomes entram com `opacity` e `translateX(-8px)` 120 ms depois da sua lâmina. Se o composto das 6 cópias não bater com a imagem (`pfb-anatomia-recortes-composto.png`), cai para a imagem inteira com `Revelar desvela` e nomes escalonados (ruling no ledger). |
| 4 | `ficha` | azul-noite | `FICHA.titulo`; `FICHA.numeros` (5): 72,3 MPa em destaque sozinho em cima, os outros 4 em 2 × 2; `FICHA.ressalva` (legenda); um bloco que abre ao tocar, `FICHA_COMPLETA`; o cartão do manual (`SolicitarManual variant="card" tom="noite"`) | Números com linha `#2347A0` de 2 px à esquerda, rótulo em legenda `#F6F5F2` a 70%. `Revelar sobe` escalonado de 80 ms; sem contagem (`AnimatedStat` não entra). O bloco: `details`/`summary` nativo, resumo em Noto Serif 17 branco com "+" à direita, 56 px de alto, sem ícone, sem caixa; dentro, pares rótulo/valor em Inter 14/22, `#F6F5F2` a 80%. `tom="noite"` é variante nova de `SolicitarManual`: `data-teste="manual-cartao"`, sem sobrancelha, sem ícone, texto "Manual Técnico de Instalação" + botão vazado claro "Solicitar manual". |
| 5 | `agua` | azul-noite | `AGUA.titulo`, `AGUA.frase`, `AGUA.horas` (3 rótulos e legendas), `AGUA.aviso` | Fotos `pfb-teste-agua-{0h,24h,48h}.jpg` recortadas em 3:4 centrado no aquário. **Celular:** uma foto de 300 × 400 px e três botões de texto "0h · 24h · 48h" embaixo (`aria-pressed`); o toque troca a foto por `opacity` em 300 ms; começa em 0h; sem avanço automático, sem trilho. **Computador:** as três lado a lado em 75% da largura, com o rótulo da hora sobre o canto de cima de cada foto (fundo sólido branco, como na Tecnologia) e a legenda embaixo. Alt: `AGUA.horas[i].alt`. `Revelar desvela` no bloco. |
| 6 | `manaus` | foto + painel | `MANAUS.titulo`, `MANAUS.pontos` (2) | Foto inteira `lavabo-areas-umidas-pfb.webp` (1200 × 1600), `object-position: 50% 35%`; painel sólido `#0B1F45` nos 36% de baixo (celular) ou 40% à esquerda (computador), título em 2 linhas e os 2 pontos. Parallax leve na foto. |
| 7 | `linhas` | creme | `LINHAS.titulo`, as 3 linhas (`LINHAS.curtas`: nome + frase de uma linha, cada uma um link para `catalogoPath(linha)`), botão primário "Ver os modelos" | **Segundo momento especial: o leque.** 5 amostras de `ConhecaPfb` (as mesmas imagens: classic-bege-travertino-orb001, brilliance-bronze-armani-orb005, elegance-imbuia-orb002, brilliance-gris-pietra-orb009, classic-branco-calacatta-orb006), cartão 3:4 de 128 × 171 px no celular e 180 × 240 no computador, borda branca de 3 px, sem `ring`; posições finais `rotate` −16 / −8 / 0 / 8 / 16° e `translateX` −80 / −40 / 0 / 40 / 80 px (×1,4 no computador), `transform-origin: 50% 100%`; partem todas em `rotate(0) translateX(0)` e abrem do centro para fora. Contêiner do leque com `overflow-x: clip` (não `hidden`). Cada linha: nome em t3 + frase em legenda + seta, `data-teste="ver-linha"`. As fotos por linha (`lerModelosPorLinha`) saem desta página. |
| 8 | `instalador` | azul-noite | `INSTALADOR.titulo`, `INSTALADOR.frase` | `VideoShort` (id `hpgoCY8L2PI`, pôster `opiniao-instalador-adam-werk.jpg`) com recorte novo **4:5, 300 × 375 px**, `object-position: 50% 30%`, legenda "Assistir" numa faixa sólida `#0B1F45` de 40 px na base do pôster, sem gradiente e sem sombra (props novas no `VideoShort`; o padrão atual continua para /academia). O vídeo 9:16 abre no toque num painel de tela cheia com fundo `#0B1F45` e botão fechar. |
| 9 | `onde-usar` | creme | `SERVE.titulo`; três blocos que abrem ao tocar, um por vez (`details name="serve"`): `SERVE.ondeUsar`, `SERVE.ondeNaoUsar`, `SERVE.comoInstalar` | Resumo de cada bloco visível fechado (`resumo`), conteúdo em Inter 14/22, até 6 linhas. `SERVE.comoInstalar` termina com `antesDoManual` + `SolicitarManual variant="link" tom="claro"`. Fechado: ~390 px. |
| 10 | `bambu` | foto + painel | `BAMBU.titulo` (2 linhas, a segunda em itálico), `BAMBU.frase` | Foto inteira `escada-degraus-pfb-2026-10.jpg` (1080 × 900), `object-position: 40% 50%`; painel sólido `#0B1F45` como no 6. Parallax leve. `onde-aplicar-main.jpeg` não entra (render com códigos gravados). |
| 11 | `como-pedir` | creme | `PEDIR.titulo`, `PEDIR.frase`; até 6 showrooms em grade 3 × 2 de miniaturas quadradas (108 px no celular) com só o nome embaixo (legenda, 1 linha), `data-teste="lugar"`, link para a página de cada lugar; `PEDIR.revendas` + os nomes das revendas de `carregarLugares` juntos numa linha; `PEDIR.orcamento`; botão primário `PEDIR.botaoConsultor` (`ContatoCta origem="pfb-como-pedir"`); link de texto `PEDIR.reserva.link` → `/projetos` | Sem endereço nem contagem nos cartões. 96 px de respiro antes do rodapé. Se não houver showroom no banco, a grade some e fica a linha das revendas (hoje `REVENDA_RESERVA`). |

### Ritmo

creme (painel da abertura) · creme · creme (pico) · azul · azul · foto · creme (leque) · azul · creme · foto · creme. Nunca mais de dois campos claros seguidos de capítulos de texto; foto inteira a cada 3 a 4 telas.

### Um lugar por fato

0,2%: capítulos 4 e 5 (é o assunto do teste). 11 kg e 3,2 kg/m²: só no 4. Mofo, cupim, chamas, formaldeído: selos do 2 e `FICHA_COMPLETA`. 10 anos: capítulo 6 e `FICHA_COMPLETA`. As três linhas: só no 7. "Ver os modelos": botão no 1 e no 7. Manual: cartão no 4 e link no "Como instalar" do 9.

## Textos finais (`src/lib/pfb-textos.ts`)

Cada frase com `// fonte:` (as notas do vault já citadas no cabeçalho do arquivo). Chaves que não aparecem abaixo saem do arquivo.

```ts
ABERTURA = { titulo, lead, estoque, botaoModelos, botaoConsultor, alt }   // como hoje; sai `legenda`

O_QUE_E = {
  // fonte: [Nome] (renovável, leve), orbital-marca (pensado para o clima de Manaus), [Ficha] (flexível)
  frase: "Fibra de bambu renovável, leve e flexível, pensada para o clima de Manaus.",
  // fonte: [Ficha]
  medidas: "1,20 × 2,90 m · 5 mm · 3,48 m² por placa",
}

SELOS = [                                  // ícone em public/images/selos/pfb-icone-<icone>.svg
  { icone: "agua",   nome: "Baixa absorção de água" },     // [Ficha] 0,2% em 48 h
  { icone: "pragas", nome: "Resistente a mofo e cupim" },  // [Ficha]
  { icone: "chamas", nome: "Não propaga chamas" },         // [Ficha], [Dono Q3]
  { icone: "pu",     nome: "Aplicação rápida" },           // [Instalação] 2 a 3 h por cômodo na parede
  { icone: "eco",    nome: "Fibra de bambu renovável" },   // [Nome]
  { icone: "flex",   nome: "Flexível e leve" },            // [Ficha], [Nome]
]

CAMADAS = { titulo: "A placa por dentro", lead: "Cinco camadas formam a placa de 5 mm.", nomes: [...] }  // como hoje; sai `legenda`

FICHA = {
  titulo: "Ficha técnica",
  numeros: [                                              // ordem: o primeiro é o destaque
    { valor: "72,3 MPa",  frase: "Resistência à flexão." },
    { valor: "0,2%",      frase: "Absorção de água em 48 h." },
    { valor: "3,2 kg/m²", frase: "Cerca de 11 kg por placa." },
    { valor: "550 kg/m³", frase: "Densidade do substrato de fibra de bambu." },
    { valor: "0,5%",      frase: "Teor de umidade." },
  ],
  // fonte: [Onde]
  ressalva: "O Painel é acabamento e não substitui a impermeabilização: em banheiro e box, a base precisa estar impermeabilizada.",
}

FICHA_COMPLETA = {
  resumo: "Ficha técnica completa",
  linhas: [                                               // pares rótulo / valor, todos de [Ficha] salvo indicação
    ["Medida útil", "1,20 × 2,90 m"],
    ["Espessura", "5 mm, em cinco camadas"],
    ["Área por placa", "3,48 m²"],
    ["Mofo e cupim", "Resistente"],
    ["Formaldeído", "Não contém"],
    ["Fogo", "Não propaga chamas"],
    ["ART", "Anotação de Responsabilidade Técnica registrada no CREA para parede e forro de teto."],
    ["Durabilidade", "Esperada de 10 anos ou mais."],
    ["Garantia", "Garantia legal do Código de Defesa do Consumidor contra vício de fabricação. Confira as placas na entrega: placa com defeito aparente não deve ser instalada; avise a Orbital por escrito, com fotos, antes de aplicar."],  // [Garantia]
  ],
}

AGUA = {
  titulo: "Teste de água",
  // fonte: [Ficha] (0,2% em 48 h, absorção)
  frase: "A placa passou 48 horas na água. No ensaio, a absorção foi de 0,2%.",
  horas: [
    { rotulo: "0h",  legenda: "Início.",            alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, no começo do teste de água" },
    { rotulo: "24h", legenda: "24 horas na água.",  alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 24 horas na água" },
    { rotulo: "48h", legenda: "48 horas na água.",  alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 48 horas na água" },
  ],
  // fonte: [Ficha] (imagens ilustrativas); D2
  aviso: "Imagens ilustrativas.",
}

MANAUS = {
  // fonte: orbital-marca ("pensado para o clima de Manaus")
  titulo: "Pensado para o clima de Manaus.",
  pontos: [
    "Para paredes e tetos de ambientes internos, secos ou úmidos.",   // [Onde]
    "Durabilidade esperada de 10 anos ou mais.",                       // [Ficha]
  ],
}

LINHAS = {
  titulo: "Três linhas",
  curtas: [                                               // fonte: [Classic], [Brilliance], [Elegance]
    { linha: "Classic",    frase: "Mármore fosco, sem reflexo." },
    { linha: "Brilliance", frase: "Mármore polido, de alto brilho." },
    { linha: "Elegance",   frase: "Madeira texturizada e fosca." },
  ],
  botaoModelos: "Ver os modelos",
}

INSTALADOR = {
  // fonte: Pendente do dono, item 6 (título atual no ar)
  titulo: "Opinião de um instalador",
  frase: "Como é aplicar o Painel na prática, contado por quem aplica.",
}

SERVE = {
  titulo: "Serve para o meu projeto?",
  ondeUsar:    { titulo: "Onde usar",     resumo: "Ambientes internos, secos ou úmidos.",             paragrafos: [/* os dois de hoje */] },
  ondeNaoUsar: { titulo: "Onde não usar", resumo: "Piso, bancada, áreas externas e calor contínuo.",  paragrafos: [/* o de hoje */] },
  comoInstalar: {
    titulo: "Como instalar",
    // fonte: [Instalação]
    resumo: "Parede com cola PU. Teto e forro sempre com fixação mecânica.",
    paragrafos: [
      "Base firme, seca, limpa e plana, com teste a seco antes da cola.",                                                     // [Instalação]
      "Na parede, cola PU de alta aderência. A aplicação leva de 2 a 3 horas por cômodo, sem quebradeira.",                   // [Instalação], [Dono E-5]
      "No teto e no forro, sempre com fixação mecânica (cola e parafusos, perfis ou malha híbrida), com cola de contato e espuma expansiva.",  // [Instalação], dono 07/11
    ],
    antesDoManual: "A Orbital fornece o material, e a aplicação fica com o profissional que você escolher e contratar. O passo a passo está no ",
    depoisDoManual: ".",
  },
}

BAMBU = {
  // fonte: [Nome] (fibra de bambu renovável); segunda linha: fato de domínio público, passa no revisor-tecnico; se reprovar, fica só a primeira
  titulo: ["Fibra de bambu renovável.", "O bambu rebrota depois do corte."],
  // fonte: [Ficha]
  frase: "Sem formaldeído, para ambientes onde as pessoas vivem e trabalham.",
}

PEDIR = {
  titulo: "Onde ver e como pedir",
  frase: "Veja o PFB aplicado nos showrooms parceiros.",              // [Showroom]
  revendas: "Placas em grande formato nas revendas:",                  // [Showroom], decisão de 07/11 (4 revendas)
  orcamento: "Mande a área em m² ou a planta, a linha e o modelo. Um consultor responde com os valores e as condições, ou vai até o seu escritório com as amostras.",  // [Brief §6], [Dono E-6]
  botaoConsultor: "Falar com um consultor",
  reserva: { link: "Ver projetos e showrooms" },
}
```

## Imagens

| Arquivo novo em `public/images/pfb/` | Origem | Estado |
|---|---|---|
| `pfb-teste-agua-0h.jpg`, `-24h.jpg`, `-48h.jpg` (1080 × 1935, ~250 KB) | `git show f62f8c7^1:public/images/catalogue/pfb-mdf-*.png`, marca do Gemini apagada por difusão (`.superpowers/sdd/2026-11-07-pfb-experiencia/imagens/tirar-marca.py`) | pronto em `.superpowers/sdd/.../imagens/` |
| `pfb-anatomia-sem-rotulos.png` (fundo transparente) + `src/lib/pfb-anatomia.ts` (polígonos e `fechadoY`) | `public/images/catalogue/product-anatomy.png` | em preparo (agente) |
| selos, amostras do leque, `escada-madeira-pfb-2026-10.jpg`, `lavabo-areas-umidas-pfb.webp`, `escada-degraus-pfb-2026-10.jpg`, pôster do vídeo | já no repo | usar |

As fotos novas não entram no `SITE_ASSET_MANIFEST` (painel de troca): a página nova não usa `resolveAsset`. `/sobre` continua com a PNG antiga (fora do escopo; vai para Perguntas abertas).

## Arquivos

| Arquivo | C / A / D |
|---|---|
| `src/app/produtos/pfb/page.tsx` | A: compõe os 11 capítulos; sai `lerModelosPorLinha` |
| `src/components/pfb/AberturaPfb.tsx`, `CamadasPfb.tsx`, `FichaPfb.tsx`, `LinhasPfb.tsx`, `ServePfb.tsx`, `FechamentoPfb.tsx` | A (reescritos) |
| `src/components/pfb/OQueEPfb.tsx`, `AguaPfb.tsx`, `ManausPfb.tsx`, `InstaladorPfb.tsx`, `BambuPfb.tsx`, `CapituloFoto.tsx` (foto inteira + painel sólido, usado por 6 e 10) | C |
| `src/components/pfb/PlacaEmEscala.tsx` | D |
| `src/lib/pfb-textos.ts` | A (texto acima) |
| `src/lib/pfb-anatomia.ts` | C |
| `src/lib/movimento/camadas.ts`, `camadas.test.mjs` | D |
| `src/app/globals.css` | A: sai o bloco "PFB: a placa por dentro" (linhas ~1402–1449; a regra da foto da abertura muda); entram `pfb-leque`, `pfb-lamina` e os capítulos |
| `src/components/SolicitarManual.tsx` | A: `tom="noite"` |
| `src/components/VideoShort.tsx` | A: props de recorte 4:5 e faixa sólida; padrão intacto |
| `scripts/verificar-pfb.mjs` | A (ver Verificação) |
| `public/images/pfb/*` | C |
| `src/components/AnimatedStat.tsx`, `ConhecaPfb.tsx`, `/academia`, `/sobre`, `assets.ts` | sem mudança |

## Movimento: como é feito

- Leque e lâminas: keyframes `pfb-leque-abre` e `pfb-lamina-encaixa` em CSS, com `animation-timeline: view()`, `animation-range: entry 10% entry 90%`, `animation-fill-mode: both`, dentro de `@media (prefers-reduced-motion: no-preference) { @supports (animation-timeline: view()) { ... } }` e só quando `html[data-mv-nivel="completo"]` (o atributo que o `SCRIPT_NIVEL` de `lib/movimento/nivel.ts` já põe). A animação segue a rolagem durante a entrada e termina no estado final antes do capítulo chegar ao meio da tela; não há pin.
- Sem `view()` (Safari antigo): um `IntersectionObserver` põe a classe `pfb-entrou` uma vez e a mesma animação roda por tempo (900 ms, `cubic-bezier(.2,.7,.2,1)`, 70 ms entre lâminas e entre pares do leque).
- Estado padrão do CSS (sem JS, reduzido, nível leve) = estado final.
- Parallax das fotos inteiras: o mesmo da home (`Revelar` / `globals.css`), até 24 px, só no nível completo.

## Verificação

1. `npx tsc --noEmit` sem erro; `npm run lint` sem erro novo em relação à `main`; `node --test` dos testes que restarem.
2. `scripts/verificar-pfb.mjs --etapa 2`: sai tudo o que dependia de `section#tecnologia .pfb-cam`, `svg.pfb-cam-svg`, `PlacaEmEscala`, `section#linhas [data-teste="miniatura"]` e do import de `camadas.ts` (linha 35 e as funções da cena, ~1166–1590). Ficam: SEO, schemas, redirecionamentos, links, `consultor_clicado` e `manual_solicitado` (`section#ficha [data-teste="manual-cartao"] button`), lugares (`section#como-pedir [data-teste="lugar"]`), sem rolagem lateral em todas as larguras, `PROIBIDOS`. O `\bmdf\b` ganha exceção só para os `alt` de `section#agua`. Entram:
   - os 11 `section[data-capitulo]` na ordem da tabela;
   - em 390 × 844: cada capítulo com `getBoundingClientRect().height ≤ 680` (o 1 com `≤ innerHeight − 80`); em 1440 × 900: `≤ 820`; com movimento completo e com `reducedMotion: "reduce"`;
   - com `reducedMotion: "reduce"`: lâminas e cartões do leque com o `transform` final;
   - `scrollWidth ≤ innerWidth` também com o leque a meio caminho;
   - os três `details` do capítulo 9 fechados ao carregar, um por vez abertos;
   - capítulo 5 no celular: os três botões trocam a foto e o `aria-pressed`.
3. Portão de movimento: `node scripts/medir-movimento.mjs` na página local com os mesmos parâmetros da E2/3 (os do ledger `2026-11-07-pfb-e2-pagina/progress.md`), `acima33 = 0`, CLS < 0,05; quadro isolado só conta como artefato se também aparecer na linha de base da `main` medida no mesmo worktree temporário (memória `reference_linha_de_base_site.md`).
4. Prints tela a tela em 390 × 844, 390 × 664, 768 × 1024 e 1440 × 900 (`.superpowers/checks/telas-celular.mjs` ganha `--largura` e `--altura`), folha de contato de cada.
5. `revisor-tecnico` (fatos e números), `qa-revisor`, `orbital-marca` antes dos prints irem ao dono. Publicar só com o OK do dono.

## Fases

F1 imagens e textos (`pfb-textos.ts`, `pfb-anatomia.ts`, `public/images/pfb/`), compila. F2 os 11 capítulos estáticos com ids, sem os dois momentos especiais; `verificar-pfb` atualizado e verde. F3 lâminas e leque. F4 portão, prints, revisões.

## Perguntas abertas (não bloqueiam; ficam fora até o dono responder)

- Número da ART e nome do engenheiro na página (o vault tem; o site hoje não mostra).
- Nome e papel do instalador do vídeo (Adam, da Werk Engenharia?) e o título do vídeo no YouTube.
- Ciclos térmicos (–10 °C a +120 °C), junta de dilatação a cada 3 m, irregularidade máxima de 2 mm, ±10%, inodoro, sem VOCs: fatos da Tecnologia sem fonte no vault.
- Perfis de alumínio para bordas e cantos (vault: em chegada).
- Selos da Academia (`DiferenciaisPfb`) ainda dizem "Retardante de chamas", "outras pragas" e "com cola PU"; e `/sobre` usa a anatomia com os rótulos antigos.

## Registro das revisões Goldfish (v1 → v2)

Prontidão (3 B, 14 M, 9 m) e design (4 B, 10 M, 7 m). Aplicados: B1 prontidão (mecanismo do movimento: seção "Movimento"), B2/B5 design e B2 prontidão (orçamento de 680 px, fusões: notas de instalação foram para o 9, linhas fundidas com o leque, 11 capítulos), B3 prontidão e M9 design (`FICHA_COMPLETA` escrita, visual novo), B4 design e M17 prontidão (abertura decidida), M4 (camadas.ts removido e script), M5 (ids), M6 (`tom="noite"`), M7 e m19 design (selos reescritos, sem quadrado), M8 (instalador sem afirmação sem fonte), M9 prontidão (perfis fora), M10 (alt, exceção do mdf, "Imagens ilustrativas"), M11 e M13 design (foto do bambu trocada), M12 (copy escrita), M13 prontidão e m21 design (verificação com medidas), M14 prontidão e M6 design (lâminas partem encaixadas, PNG transparente), M15 e m15 design (leque medido, `overflow-x: clip`), M16 e M10 design (sem contagem), M7 design (sem trilho na água), M8 design (um lugar por fato), M11 e M12 design (ritmo e ordem), M14 design (escala), m16 (área do chat), m17 (itálico só no 10), m18 (um bloco aberto por vez), m20 (fim: respiro antes do rodapé; a assinatura já está no rodapé, não repete), m18–m26 prontidão (decisões pequenas fixadas, ledger nomeado, D1 esclarecido, gradiente do vídeo, sobras listadas, peso das imagens, tabela C/A/D, fases, trilho não usado). Recusado: nenhum. Escalado ao dono: só as Perguntas abertas, que não bloqueiam.

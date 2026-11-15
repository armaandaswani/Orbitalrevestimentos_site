# PFB Carbon (Luxury Line): página de apresentação — design

Data: 15/11/2026 · Branch: `pfb-carbon` · Situação: aprovado pelo dono em 15/11/2026, com três pedidos: texto mais humano (os textos das telas abaixo são rascunho; os finais saem do `humanizer`), foto real tratada, e os termos "adesivo de alta aderência" e "substrato em fibra de bambu carbonizado"

## Para que serve

O PFB Carbon é a linha de luxo do Painel Flexível em Fibra de Bambu e ainda vai chegar a Manaus. Hoje ele só existe no site como um cartão "Em breve", sem página. A página apresenta a linha antes da chegada, explica por que ela é diferente por dentro e leva o visitante para a lista de espera já com o modelo escolhido.

A mensagem que o dono quer martelar: **a Orbital muda a composição dos materiais para que fiquem cada vez mais resistentes ao clima amazônico**, levando em conta a umidade e a temperatura média anual da região. O Carbon é a prova disso.

## O que o dono afirmou (só isto vira texto público)

- Uso interno, parede e teto.
- Miolo de bambu carbonizado, que dá mais estabilidade em temperaturas altas.
- SPC dos dois lados do miolo.
- Cola e filme PET por cima, como no processo do PFB.
- Composição melhorada e mais resistente.
- Placa de 2,80 m × 1,20 m × 5 mm (15/11/2026).
- Densidade da base: 650 kg/m³. Placa com o filme PET: por volta de 720 kg/m³ (15/11/2026).
- Modelos: os da pasta `PFB Carbon Luxury` (Carvalho Natural, Imbuia, Jatobá, Louro Freijó, Pau Ferro).

## Fora da página (anti-objetivos)

- Nenhum número de temperatura, umidade, fogo, absorção ou resistência: não há laudo do Carbon. Os números da ficha do PFB (0,2% de absorção, 72,3 MPa etc.) não são herdados.
- Nada sobre áreas úmidas, banheiro ou box: o dono não afirmou isso para o Carbon.
- Não dizer que a placa faz curva.
- Não diminuir o PFB: ele continua à venda. A página diz o que o Carbon acrescenta.
- Sem preço, sem data de chegada, sem quantidade da remessa em número.
- Sem concorrentes, sem falar mal de outros materiais, sem dizer que a Orbital instala, mede ou projeta.
- Nenhum ambiente gerado por IA nesta primeira versão (ver "Imagens").
- Nada do visual da TechStone: outra paleta, outras imagens, outro nome em tudo.

## Caminhos considerados

1. **Apresentação em telas, com o motor da /techstone e visual próprio (escolhido).** Cada seção ocupa uma tela e toca sozinha ao chegar. Reaproveita `useToque`, `BotaoToque`, `Encaixe` e `ListaEsperaSheet`, que já passaram por teste no Safari. É o padrão que o dono aprovou em 14/11.
2. **Capítulo dentro de /produtos/pfb.** Mais barato, mas esconde uma linha de luxo dentro da página de outra linha e não dá endereço próprio para divulgar.
3. **Página de rolagem comum, com as imagens entrando pela rolagem.** É o modelo que o dono pediu para abandonar.

## Endereços

- `/pfb-carbon`: a apresentação.
- `/pfb-carbon/catalogo`: os cinco modelos, com a textura para baixar e "Tenho interesse".

## Visual

- Fundo carvão `#131211`, texto marfim `#F2EEE6`, linhas finas em latão `#B08D57`. Noto Serif nos títulos, Inter no resto, sem sombras (manual da marca).
- O escuro vem do próprio material: o miolo carbonizado é quase preto. A cor entra pelas madeiras.
- "Luxury Line" aparece como rótulo pequeno em versalete acima do nome, nunca como título.

## Imagens

- **Fotos reais do miolo** (6, do dono, em `side-session-notes/.../miolo-pfb-carbon/`): corrigir o tom amarelo, recortar e escurecer o fundo. A 2 (close) e a 5 (placa na mão) são as principais. Legenda "Foto real da placa em corte."
- **Texturas reais** dos cinco modelos, recortadas na proporção da placa (1,20 × 2,80). Jatobá e Pau Ferro vieram em outra proporção e são recortadas.
- **Camadas**: desenho feito em CSS com as cores reais (madeira do modelo, SPC claro, miolo escuro). É diagrama, não foto, e não finge ser.
- Sem ambientes: não existe foto de obra do Carbon. Quando houver, entra uma tela "na parede e no teto" entre os números e os modelos.

## As telas

Todas com `ts-encaixe-ponto`; as marcadas com ▶ tocam sozinhas (`useToque`) e têm o botão de pausa.

1. **Abertura ▶** (≈8 s). Tela escura com "PFB Carbon" e o rótulo "Luxury Line". A madeira Louro Freijó acende por trás, em placas inteiras. Três frases, uma por vez: "Painel Flexível em Fibra de Bambu." · "Por dentro, bambu carbonizado." · "Feito para o clima da Amazônia." No fim: "Chega em breve a Manaus." com **Entrar na lista de espera** e **Ver os modelos**.
2. **O miolo.** A foto real em corte ocupando a tela (metade no computador, ao lado do texto). Título "Por dentro, bambu carbonizado." Uma linha: "O miolo é feito de bambu carbonizado. Fica mais estável quando a temperatura sobe."
3. **A placa por dentro ▶** (≈10 s). A placa de 5 mm se abre em cinco camadas, de cima para baixo, um nome por vez: Filme PET · Adesivo de alta aderência · SPC · Substrato em fibra de bambu carbonizado · SPC. (Termos do dono, 15/11/2026: nunca "cola", nunca só "bambu carbonizado" no nome da camada.) Fecha de novo com "Cinco camadas em 5 mm." Só o nome de cada camada, sem frase de função (mesma regra do PFB).
4. **Clima amazônico ▶** (≈10 s). A tela da mensagem principal. Título grande: "Feito para o clima da Amazônia." Depois, uma por vez: "Aqui a umidade é alta o ano inteiro." · "E o calor não dá trégua." · "Por isso a Orbital muda a composição dos materiais: a cada linha, mais resistentes ao clima daqui."
5. **Em números.** Quatro números grandes: 2,80 × 1,20 m · 5 mm · 650 kg/m³ (densidade da base) · cerca de 720 kg/m³ (placa com o filme PET). Embaixo: "Uso interno: parede e teto."
6. **Os modelos ▶** (≈10 s). As cinco madeiras lado a lado, cada uma como uma placa em pé na proporção real. Uma acende por vez, com o nome. Tocar numa leva ao catálogo naquele modelo.
7. **Lista de espera.** "Seja avisado na chegada." + botão.
8. **Perguntas** (texto solto): quando chega; onde posso usar (paredes e tetos internos); qual a diferença para o PFB (o que o Carbon acrescenta; o PFB segue em pronta-entrega); como é instalado (a Orbital fornece, a aplicação é do profissional da sua escolha); qual o valor (com um consultor); posso usar as texturas no projeto.

Com `prefers-reduced-motion`, cada tela aparece parada no quadro final, com todo o texto visível, e o botão de pausa some. Sem JavaScript, o conteúdo aparece empilhado e legível.

## Catálogo (`/pfb-carbon/catalogo`)

Página estática com os cinco modelos em grade (uma coluna a 390 px). Cada cartão: a placa em pé, o nome, "2,80 × 1,20 m · 5 mm", **Baixar textura** e **Tenho interesse** (abre a lista de espera com o modelo marcado).

## Mudanças fora da página

- `src/lib/pfb-carbon.ts` (novo): modelos, medidas, densidades, textos fixos. Fonte única da página, do catálogo e da lista de espera.
- `src/lib/linhas.ts`: o cartão do Carbon ganha `href: "/pfb-carbon"`, resumo novo e imagem (textura real). O `Navbar` lê `LINHAS`; `Navbar.tsx` não é editado.
- `src/app/api/lista-espera/route.ts`: `MODELOS_VALIDOS.carbon` com os cinco nomes.
- `src/app/sitemap.ts`: os dois endereços.
- `src/app/globals.css`: bloco próprio `PFB Carbon` (prefixo `pc-`), sem tocar nas regras `ts-`.
- `public/images/pfb-carbon/`: texturas (webp para a tela, jpg para baixar) e fotos do miolo tratadas.
- Não muda: o cadastro do admin, que usa 1,22 m de largura para o Carbon (largura bruta do fornecedor). Fica como pendência para o dono decidir.

## Pronto quando

- Bateria Playwright a 1440 px e 390 px, com e sem movimento reduzido: sem vazamento lateral, cada tela encaixa, cada ▶ toca e pausa, lista de espera abre com o modelo marcado, catálogo baixa a textura.
- Conferida no Safari do simulador de iPhone (deslize com inércia).
- `npx tsc --noEmit`, `npx eslint` nos arquivos tocados e `npm run test:movimento` limpos.
- Textos passados por `orbital-marca` e `humanizer`.
- Deploy confirmado com `esperar-deploy.sh /pfb-carbon "<texto novo>"`.

## Decisões minhas, para o dono corrigir

- Endereço `/pfb-carbon`.
- Cinco modelos da pasta; a Nogueira da captura do fornecedor fica de fora até haver textura.
- Sem ambientes gerados por IA nesta versão.
- Louro Freijó na abertura (é o modelo com mais placas previstas).
- Densidades publicadas como o dono passou: "650 kg/m³" e "cerca de 720 kg/m³".

# Página do PFB: ajustes da auditoria de 14/11/2026

Data: 15/11/2026 · Branch `pfb-enxuta` · Auditoria: `side-session-notes/…/auditoria-pfb.md`

## Por quê

O dono pediu a revisão da página do PFB no mesmo espírito da TechStone: limpa, fluida, sem depender do ritmo da rolagem. A auditoria mediu que a página não tem rolagem presa e tem 9,6 telas (o tamanho da TechStone nova). O que pesava era outra coisa: figuras que ficavam meio montadas quando a pessoa parava de rolar, vazios entre capítulos da mesma cor, a ficha técnica no celular mostrando 1 de 5 números e um capítulo com a coluna do título vazia.

## O que mudou

- **Figuras tocam sozinhas.** A placa por dentro, o leque das linhas e o recorte da foto do bambu deixaram de seguir a rolagem (`animation-timeline`) e passam a tocar por tempo quando chegam à tela, em todo navegador (`EntradaPfb`, que antes só valia onde não havia `animation-timeline`). 800 ms por peça, 80 ms entre vizinhas (1,2 s no total). O parallax de 24 px das fotos saiu.
- **Sem vazio entre capítulos da mesma cor.** "O que é" e "A placa por dentro" (creme), "Ficha técnica" e "Teste de água" (azul-noite): o respiro somado caiu de 192–224 px para 96 px no computador e de 96–112 px para 64 px no celular.
- **Trilho que passa sozinho no celular.** A ficha (5 números) e o "Como instalar" (3 passos) continuam um item por vez, como o dono pediu em 08/11, mas agora avançam sozinhos a cada 2,4 s até o último, e qualquer gesto no trilho devolve o comando. Sem movimento reduzido.
- **"Serve para o meu projeto?" no computador.** O título e o "Como instalar" (passos empilhados) à esquerda, as duas listas à direita. A coluna do título deixou de ficar vazia e o capítulo caiu de 788 para 684 px.
- **Fecho.** Quatro lugares ficam 4 numa linha no computador e 2 + 2 no celular, em vez de 3 + 1 com um sobrando. O parágrafo do orçamento quebra sem palavra solta (`text-pretty`).

## O que não mudou, de propósito

- **Os 11 capítulos ficam.** A auditoria sugeria fundir Manaus com Bambu e reduzir para 7. Os dois capítulos de foto são os momentos de imagem grande da página, que é o que o dono pede agora para projetos e catálogo; e a página já tem o tamanho da TechStone. Se ele quiser a fusão, é um passo à parte.
- A intro da órbita (3,2 s na primeira visita) e o rodapé alto no celular (1,58 tela) são do site inteiro: ficam para decisão do dono.
- O alinhamento da borda esquerda dos capítulos de foto (56/60 px, contra 140 px do resto a 1440): a composição deles foi ajustada com o verificador (painel sem corte em janela baixa) e mexer nela pede outra rodada.
- A entrada dos selos de "O que é" usa o `Revelar` do site inteiro (curta, no primeiro terço da tela) e ficou como está.

## Verificação

- `node ~/orbital-movimento/.superpowers/checks/pfb-enxuta.mjs <base> <pasta>` a 1440 × 900, 390 × 844 e com movimento reduzido.
- `scripts/verificar-pfb.mjs --etapa 2`: saíram as três checagens do caminho por rolagem (leque a meio caminho, 8a e 8c); o caminho por tempo segue em 8b e 8d.
- `npm run test:pfb`, `tsc`, `eslint`.

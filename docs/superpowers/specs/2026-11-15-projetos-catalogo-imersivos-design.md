# Projetos e catálogo imersivos

Data: 15/11/2026 · Pedido do dono · Branch `projetos-imersivo` · Auditoria: `side-session-notes/…/auditoria-projetos.md`

## Por quê

O dono quer para projetos e para os modelos do catálogo a sensação do site rockstargames.com/VI: uma imagem enorme por tela, quase sem texto, moldura mínima. Hoje as capas ficam pequenas (quatro por linha), e ao abrir um projeto ou um modelo a foto usa um terço da tela, com o resto em barras e botões. Em 04/11 ele não achou os projetos numa apresentação e pediu a grade com busca e filtros: a imersão não pode custar a facilidade de achar.

## Decidido pelo dono

- `/projetos` abre com destaques em tela cheia e, logo abaixo, a grade completa com filtros e busca.
- "Onde ver o PFB" e "Simulações" ficam como estão.
- No catálogo do PFB a entrada continua sendo a grade (mais limpa); o detalhe do modelo abre em tela cheia.

## Desenho

**Destaques (topo de `/projetos`).** Os projetos marcados como destaque no painel (hoje 4; no máximo 5, na ordem do painel), um por tela:
- Celular: a foto ocupa a tela inteira; embaixo, sobre um véu, o nome do projeto, uma linha (modelo e tipo de ambiente) e "Ver projeto".
- Computador: as fotos são quase todas em pé ou quadradas e têm 1080 px de lado, então não dá para esticá-las na tela toda sem perder nitidez. A foto aparece inteira, na altura da tela, à direita; atrás, a mesma foto desfocada e escurecida preenche a tela; à esquerda, o nome, a linha e o botão.
- A página encaixa em cada destaque (o mesmo encaixe da TechStone: nativo no toque, por regra com mouse). Sem destaque marcado no painel, a página abre direto na grade.

**Grade.** O título "Todos os projetos", a barra de filtros e busca de hoje, e cartões maiores: 3 por linha no computador (eram 4), 2 no celular. O enquadramento 4:5 de cada capa é o que o dono escolhe no painel (foco e aproximação) e fica; a foto inteira aparece ao abrir o projeto.

**Projeto aberto (galeria).** A foto ocupa a altura inteira da tela. Atrás dela, a mesma foto desfocada preenche os lados. O título, os modos (uma por vez, grade, lado a lado) e o fechar ficam numa faixa fina sobre a foto, em cima; a legenda, o contador e "anterior / próximo projeto" ficam embaixo, também sobre a foto. O filtro de fotos só aparece quando há de fato mais de um tipo (antes, depois, detalhe). Deslizar e as setas continuam trocando de foto.

**Catálogo do PFB.**
- Grade: cartão só com a foto, o nome, a linha e o código. Saem a medida repetida em todos, as letras de 8 a 10 px e o botão "Ver detalhes" (o cartão inteiro abre o modelo).
- Modelo aberto: a foto ocupa a tela inteira (a altura toda, com o fundo desfocado da própria foto), as outras fotos passam ao deslizar ou pelas setas, com uma fileira fina de miniaturas embaixo. Nome, linha e "Falar com um consultor" ficam sobre a foto; a ficha, a textura para baixar, o QR e o compartilhar abrem num painel "Detalhes" que sobe por cima.

## Fica como está

Dados e painel, filtros e busca, URLs (`?projeto=`, `?categoria=`, `?ver=`, `?modelo=`, `?linha=`), a folha dos showrooms, "Onde ver o PFB", "Simulações", a chamada final e o rodapé.

## Correções de dados que acompanham

A foto do `lavabo3` que dá erro 404 e o link de vídeo malformado do Foston são do banco: não mudo dado do dono; a galeria passa a pular mídia que não carrega, e a lista segue no relatório para ele corrigir no painel.

## Restrições e portões

- Textos novos pela `orbital-marca` e pelo `humanizer` ("Todos os projetos", "Ver projeto", "Detalhes").
- `prefers-reduced-motion`: sem encaixe e sem transições; tudo visível.
- Playwright a 390 e 1440: destaques na ordem do painel, encaixe, grade com filtro e busca funcionando, projeto abre pela URL e pelo clique, foto com pelo menos 90% da altura da tela, voltar fecha, catálogo abre e fecha o modelo pela URL, sem vazamento lateral, sem erros de console. Verificador do PFB (`scripts/verificar-pfb.mjs --etapa 2`) atualizado no que tocar o catálogo.
- Entrega em duas publicações: primeiro `/projetos`, depois o catálogo.

## Decidido por mim (pode mudar)

- Destaques são os do painel (até 5), não uma escolha fixa no código.
- No computador, foto inteira com fundo desfocado, em vez de esticar a foto.
- A capa da grade mantém o enquadramento 4:5 do painel.

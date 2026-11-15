# Parcerias por perfil e Revenda no menu

Data: 15/11/2026 · Pedido do dono · Branch `parcerias-revenda`

## Por quê

A página `/parcerias` está poluída: cerca de 950 palavras à vista (1.800 contando as cinco abas), em 8 blocos, com um bloco inteiro comparando materiais. O cadastro fica solto no meio, não pergunta a profissão e só tem link direto para o representante (`?rep=`). O dono quer mandar a um arquiteto um link que caia no cadastro de arquiteto, e quer "Revenda" no menu.

## Decidido pelo dono

- `/parcerias` vira porta de entrada curta, e cada perfil ganha a sua página, com o cadastro já no perfil certo.
- "Revenda" no menu abre a página para o cliente achar onde comprar; embaixo dela, o formulário de quem quer revender.

## Formas de construir

Há um caminho só: o formulário que hoje mora dentro de `parcerias/page.tsx` vira um componente (`CadastroParceiro`), com a profissão recebida de fora, e é usado nas páginas de perfil e no fim da página de lojas. A API (`/api/partners/register`) já aceita `profession` e não muda. Refazer o cadastro como folha ou em passos daria mais trabalho sem ganho para o pedido.

## Desenho

**`/parcerias` (porta de entrada, uma tela):** o título que já existe ("Para cada profissional, uma proposta única."), uma frase, e cinco cartões grandes com foto:

| Cartão | Frase | Destino |
|---|---|---|
| Arquitetos e designers | Amostras e texturas para o seu projeto. | `/parcerias/arquitetos` |
| Marceneiros | Um cômodo em 2 a 3 horas. | `/parcerias/marceneiros` |
| Engenheiros | ART e ficha técnica para aprovar sem improviso. | `/parcerias/engenheiros` |
| Revendedores | A linha Orbital na sua loja. | `/onde-comprar#quero-revender` |
| Aplicadores | Formação da Academia Orbital. | `/academia` |

Embaixo, uma linha: "Já é parceiro? Entrar no portal". O link do representante (`/parcerias?rep=CÓDIGO`) continua valendo: o código segue para a página de perfil escolhida.

**`/parcerias/arquitetos`, `/marceneiros`, `/engenheiros` (uma página curta cada):**
1. Foto em tela cheia com o título do perfil (os que já estão no ar), uma frase e o botão "Quero ser parceiro", que desce ao cadastro.
2. Três benefícios, cada um com um título e uma linha.
3. Cadastro (`#cadastro`), com a profissão já marcada. Na de arquitetos, a escolha entre "Arquiteto e Urbanista" e "Designer de interiores". O código de indicação fica atrás de "Tenho um código de indicação".
4. Botão "Copiar link" ao lado do título do cadastro: copia o endereço da página com `#cadastro` (e o `?rep=` quando houver).

Textos (três benefícios por perfil):
- Arquitetos: amostras para o moodboard; textura de cada modelo para os renders; ART e ficha técnica para o memorial.
- Marceneiros: condições próprias para compra direta; manual técnico de instalação; formação da Academia Orbital.
- Engenheiros: ART de Engenharia Civil com registro no CREA; ficha técnica (72,3 MPa de resistência à flexão, 0,2% de absorção de água em 48 h); resistente a mofo e cupim, não propaga chamas.

**Revenda:** entra "Revenda" no menu (computador e celular), levando à página das lojas (`/onde-comprar`, que continua com o mesmo endereço; `/revenda` redireciona para ela). No fim da página, a seção `#quero-revender`: "Quer revender a linha Orbital?", três pontos curtos (pronta-entrega em Manaus, condições para revendedores, catálogo e ficha técnica para a equipe) e o mesmo cadastro, com a profissão "Lojista / revendedor".

## Sai

O bloco de comparação entre materiais, os números repetidos, as abas presas, a segunda chamada final e a nota de rodapé. Os textos novos não comparam com outros materiais, não citam concorrência e não prometem número que não esteja na ficha técnica do Vault.

## Fica como está

A API de cadastro, o e-mail de confirmação, o portal do parceiro, o link `?rep=`, a página da Academia e a página das lojas (só ganha a seção no fim).

## Restrições e portões

- Textos pela `orbital-marca` e pelo `humanizer`; fatos conferidos no Vault (Programa de parceiros, Ficha técnica).
- Uma ideia por tela; alvo de menos de 120 palavras à vista por página de perfil antes do formulário.
- Playwright a 390 e 1440: sem vazamento lateral, cadastro alcançável pelo link com `#cadastro`, profissão certa enviada (API simulada no teste, nada grava em produção), "Copiar link" copia o endereço certo, menu com "Revenda" nas duas larguras.
- `prefers-reduced-motion` respeitado; `:focus-visible` em todo controle.

## Decidido por mim (pode mudar)

- Designers de interiores entram na página de arquitetos.
- Revendedores e aplicadores não ganham página de perfil: vão para a seção de revenda e para a Academia.
- `/onde-comprar` mantém o endereço (a Ste e o GA4 já usam); `/revenda` é um atalho.
- "Marceneiro" e "Aplicador / instalador" entram na lista de profissões do portal.

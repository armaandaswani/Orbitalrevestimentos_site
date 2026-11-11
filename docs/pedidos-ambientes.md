# Pedidos por ambiente e importação de quantitativo

Em **Admin → Pedidos → Novo pedido**, informe o cliente e abra **Ambientes**.
Cada ambiente tem nome, materiais, quantidades e subtotal. **Adicionar material**
inclui uma linha no ambiente; **Adicionar ambiente** cria uma nova divisão.
O mesmo modelo pode aparecer em ambientes diferentes, com preços próprios.
O estoque considera a soma de todas as linhas de cada produto.

**Importar foto ou documento** recebe JPG, PNG, WebP, HEIC, PDF, TXT, CSV e TSV,
até 4 MB e 100 materiais por arquivo. A leitura propõe linhas para conferência;
não grava o pedido. Produto, quantidade e ambiente continuam editáveis. Itens
sem correspondência exata no catálogo exigem seleção manual. A confirmação de
conferência é obrigatória. Os preços vêm do catálogo, nunca do documento.
Itens importados com o nome de um ambiente existente entram nesse ambiente.

CSV/TSV com cabeçalho explícito funciona sem IA:

```csv
ambiente;codigo;quantidade;unidade
Lavabo;ORB-002;4;placa
Lavabo;ORB-PU;8;tubo
Sala;ORB-002;2;placa
```

Fotos, PDFs e listas livres usam as credenciais de IA já configuradas no
servidor. Provedores suportados: OpenAI, Anthropic, Gemini e endpoint de chat
compatível para texto/imagem. PDF exige suporte nativo. Se o provedor estiver
indisponível, a tela explica como usar uma tabela. Quantidades não são
inferidas de plantas, cotas ou áreas. Cada arquivo precisa indicar o
quantitativo; dimensionamento técnico continua separado.

**Salvar e revisar envio** mantém o novo pedido aberto na revisão. A prévia e
o envio salvam primeiro a versão atual; falhas interrompem a ação. O documento
público e o PDF agrupam os materiais e subtotais por ambiente. Pedidos antigos
continuam usando o ambiente global quando não há ambiente por item.

## Banco e validação

Aplicar `077_pedido_item_space.sql` antes do deploy. Migração aditiva com
`pedido_items.space TEXT`; não modifica itens antigos. Aplicada e confirmada
em 10/11/2026. As APIs bloqueiam o salvamento de ambientes se faltar a coluna.

`npm run test:pedidos` cobre persistência, compatibilidade, exposição pública,
estoque agregado, importação, autenticação, validação e formatos dos provedores.
O editor foi conferido com dados simulados em 390×844, 768×1024 e 1440×900.
Foram validados subtotais, soma de placas sem atribuir área à cola, importação
com conferência, manutenção dos ambientes e envio bloqueado após erro de
salvamento. Nenhuma transação ou mensagem de cliente foi criada nos testes.

O PDF foi renderizado com 26 materiais em dois ambientes: três páginas,
numeração consistente, cabeçalho sem sobreposição e subtotal junto da última
linha do ambiente. A substituição de itens usa compensação entre chamadas ao
banco, seguindo a estrutura existente; não é uma transação SQL única.

## Rascunho automático

O editor salva imediatamente neste navegador e sincroniza o rascunho com o
servidor após uma pausa breve. O rodapé informa o último salvamento ou que a
sincronização está pendente. Nome incompleto, contatos, endereço, materiais,
ambientes, condições, etapa e medidas da calculadora também são preservados.
Ao voltar ao painel, o pedido aberto é recuperado; rascunhos fechados aparecem
em **Continuar**. Descartar uma cópia exige confirmação. O salvamento automático
não emite pedidos, reserva estoque nem envia documentos ao cliente.

A cópia local dura até 30 dias e mantém até 10 rascunhos. O servidor mantém
rascunhos por dispositivo, protegidos pela autenticação admin, com controle de
revisão para evitar sobrescrever alterações concorrentes. Uma divergência
preserva a versão local em outra cópia. A interface distingue falha de
sincronização de falha ao salvar neste dispositivo.

## Produtos com entrega futura e documentos

Os códigos ORB-020 a ORB-036 estão preparados no manifesto
`scripts/catalogo/chegada-2027-02.json`: quatro PFB Carbon, nove TechStone e
quatro perfis de acabamento em alumínio. A previsão **fevereiro de 2027** é
copiada para cada item do pedido e aparece no editor, documento público e PDF.
As quantidades da compra futura não entram no estoque disponível. Produtos
sem preço informado exigem um preço unitário antes de emitir o orçamento.

Os arquivos TechStone existentes são reutilizados. Carbon e perfis aguardam
fotos originais; a espessura conflitante de TechStone não é afirmada nos
documentos. Os ambientes têm espaço maior entre blocos, linhas mais arejadas
e subtotal junto da última linha, inclusive em documentos de várias páginas.

As migrações 078, 079 e 080 adicionam previsão de entrega, rascunhos protegidos
e preços pendentes sem alterar preços existentes. A provisão de catálogo é
idempotente e preserva produtos já cadastrados. Validado com 72 testes e
Playwright em 390×844, incluindo reload durante sincronização e recuperação
offline, sem criar pedidos reais ou enviar mensagens.

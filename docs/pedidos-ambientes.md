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

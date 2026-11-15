/**
 * Cadastro de clientes derivado dos pedidos (pedido do dono, 15/11/2026). Não há
 * tabela própria: cada pedido guarda os dados do cliente no momento da venda, e
 * aqui os pedidos do mesmo cliente se juntam. Assim todo pedido salvo já
 * "cadastra" o cliente, e quem compra de novo aparece com o histórico inteiro.
 *
 * Regra de junção: mesmo documento (só dígitos), mesmo e-mail ou mesmo telefone
 * (dígitos, sem o 55 do país), em cadeia (union-find). Pedido sem nenhum desses
 * entra pelo nome só quando há um único cliente identificado com esse nome.
 */

/** Campos do cliente no pedido, na ordem do editor. */
export const CAMPOS_CLIENTE = [
  "client_name",
  "client_email",
  "client_phone",
  "client_document",
  "client_zip",
  "client_address",
  "client_address_complement",
  "client_city",
  "client_state",
] as const;
export type CampoCliente = (typeof CAMPOS_CLIENTE)[number];

type Texto = string | null | undefined;

/** O mínimo de um pedido que o agrupamento lê. */
export type PedidoDoCliente = { [K in CampoCliente]?: Texto } & {
  id: string;
  total?: number | null;
  discount_amount?: number | null;
  status?: string | null;
  created_at: string;
};

export type Cliente<P extends PedidoDoCliente = PedidoDoCliente> = {
  /** Estável enquanto o pedido mais antigo do grupo existir. */
  chave: string;
  nome: string;
  /** Dados do pedido mais recente, completados campo a campo pelos anteriores. */
  dados: Record<CampoCliente, string | null>;
  /** Mais recente primeiro. */
  pedidos: P[];
  quantidade: number;
  /** Pedidos cancelados (ficam no histórico, fora da quantidade e do total). */
  cancelados: number;
  /** Soma de (total − desconto, mínimo 0) dos pedidos não cancelados. */
  totalGasto: number;
  ultimoPedidoEm: string;
  /** Nomes e e-mails normalizados, para a busca. */
  textoBusca: string;
  /** Telefones e documentos em dígitos, para a busca. */
  digitosBusca: string;
};

const digitos = (s: Texto) => (s ?? "").replace(/\D/g, "");

/** Minúsculas, sem acento, espaços colapsados. */
export function normalizarNome(s: Texto): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Só dígitos; tira o 55 do país quando sobram 12 ou 13 dígitos. */
export function normalizarTelefone(s: Texto): string {
  const d = digitos(s);
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

/** Telefone para leitura: "(92) 99123-4567"; o que não for DDD + número volta como veio. */
export function telefoneLegivel(s: Texto): string {
  const d = normalizarTelefone(s);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return (s ?? "").trim();
}

/** Enchimento como 000.000.000-00 ou (92) 99999-9999: um dígito repetido depois do DDD. */
const repetido = (d: string) => /^(\d)\1+$/.test(d) || /^\d{2}(\d)\1+$/.test(d);

/** Identificadores que juntam pedidos; curtos, malformados ou de enchimento não contam. */
function identificadores(p: PedidoDoCliente): string[] {
  const out: string[] = [];
  const doc = digitos(p.client_document);
  if (doc.length >= 11 && !repetido(doc)) out.push(`doc:${doc}`);
  const email = (p.client_email ?? "").trim().toLowerCase();
  if (email.includes("@")) out.push(`email:${email}`);
  const tel = normalizarTelefone(p.client_phone);
  if (tel.length >= 8 && !repetido(tel)) out.push(`tel:${tel}`);
  return out;
}

/** Campos do endereço: vêm juntos de um pedido só, para CEP e bairro não se misturarem (o frete usa os dois). */
const ENDERECO = new Set<CampoCliente>(["client_zip", "client_address", "client_address_complement", "client_city", "client_state"]);

const quando = (iso: string) => Date.parse(iso) || 0;
const vazio = (s: Texto) => !s || !s.trim();

export function agruparClientes<P extends PedidoDoCliente>(pedidos: readonly P[]): Cliente<P>[] {
  // Mais antigo primeiro: a raiz de cada grupo é o primeiro pedido do cliente.
  const ordem = [...pedidos].sort((a, b) => quando(a.created_at) - quando(b.created_at));
  const pai = ordem.map((_, i) => i);
  const raiz = (i: number): number => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  const unir = (a: number, b: number) => {
    const ra = raiz(a), rb = raiz(b);
    if (ra !== rb) pai[Math.max(ra, rb)] = Math.min(ra, rb);
  };

  const dono = new Map<string, number>();
  const semContato = new Set<number>();
  ordem.forEach((p, i) => {
    const ids = identificadores(p);
    if (!ids.length) { semContato.add(i); return; }
    for (const id of ids) {
      const j = dono.get(id);
      if (j === undefined) dono.set(id, i);
      else unir(i, j);
    }
  });

  // Nome → raízes dos grupos identificados que usam esse nome em algum pedido.
  const porNome = new Map<string, Set<number>>();
  ordem.forEach((p, i) => {
    const nome = normalizarNome(p.client_name);
    if (!nome || semContato.has(i)) return;
    if (!porNome.has(nome)) porNome.set(nome, new Set());
    porNome.get(nome)!.add(raiz(i));
  });
  // Sem contato: entra no único cliente com esse nome; senão, junta-se aos
  // outros pedidos sem contato de mesmo nome (sem nome, fica sozinho).
  const soNome = new Map<string, number>();
  for (const i of semContato) {
    const nome = normalizarNome(ordem[i].client_name);
    if (!nome) continue;
    const grupos = porNome.get(nome);
    if (grupos?.size === 1) { unir(i, [...grupos][0]); continue; }
    const j = soNome.get(nome);
    if (j === undefined) soNome.set(nome, i);
    else unir(i, j);
  }

  const grupos = new Map<number, P[]>();
  ordem.forEach((p, i) => {
    const r = raiz(i);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r)!.push(p);
  });

  const clientes: Cliente<P>[] = [];
  for (const [r, lista] of grupos) {
    const recentes = [...lista].reverse();
    const dados = {} as Record<CampoCliente, string | null>;
    const comEndereco = recentes.find((p) => [...ENDERECO].some((campo) => !vazio(p[campo])));
    for (const campo of CAMPOS_CLIENTE) {
      const achado = ENDERECO.has(campo)
        ? comEndereco?.[campo]
        : recentes.find((p) => !vazio(p[campo]))?.[campo];
      dados[campo] = achado && achado.trim() ? achado.trim() : null;
    }
    const validos = recentes.filter((p) => p.status !== "cancelado");
    const totalGasto = validos
      .reduce((s, p) => s + Math.max(0, (Number(p.total) || 0) - (Number(p.discount_amount) || 0)), 0);
    const nomes = new Set(recentes.map((p) => normalizarNome(p.client_name)).filter(Boolean));
    const emails = new Set(recentes.map((p) => (p.client_email ?? "").trim().toLowerCase()).filter(Boolean));
    const nums = new Set(recentes.flatMap((p) => [digitos(p.client_phone), digitos(p.client_document)]).filter(Boolean));
    clientes.push({
      chave: ordem[r].id,
      nome: dados.client_name ?? "Sem nome",
      dados,
      pedidos: recentes,
      quantidade: validos.length,
      cancelados: recentes.length - validos.length,
      totalGasto,
      ultimoPedidoEm: recentes[0].created_at,
      textoBusca: [...nomes, ...emails].join(" "),
      digitosBusca: [...nums].join(" "),
    });
  }
  return clientes.sort((a, b) => quando(b.ultimoPedidoEm) - quando(a.ultimoPedidoEm));
}

/** Busca sem acento e sem caixa por nome, e-mail, telefone ou CPF/CNPJ. Vazia combina com todos. */
export function clienteCombina(c: Cliente, busca: string): boolean {
  const q = normalizarNome(busca);
  if (!q) return true;
  if (c.textoBusca.includes(q)) return true;
  const d = digitos(busca);
  // Só dígitos (com pontuação de telefone/documento): compara com os números.
  return d.length >= 3 && /^[\d\s().\-/+]+$/.test(busca.trim()) && c.digitosBusca.includes(d);
}

/** Clientes que combinam com a busca; quem tem o nome começando pelo texto vem primeiro. */
export function buscarClientes<P extends PedidoDoCliente>(clientes: readonly Cliente<P>[], busca: string, limite?: number): Cliente<P>[] {
  const q = normalizarNome(busca);
  const achados = clientes.filter((c) => clienteCombina(c as Cliente, busca));
  if (q) {
    const comeca = (c: Cliente<P>) => (normalizarNome(c.nome).startsWith(q) ? 0 : 1);
    achados.sort((a, b) => comeca(a) - comeca(b)); // sort estável: mantém a ordem por recência
  }
  return limite == null ? achados : achados.slice(0, limite);
}

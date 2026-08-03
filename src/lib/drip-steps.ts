/**
 * Régua de e-mails do orçamento — FONTE ÚNICA do conteúdo.
 *
 * Antes o texto existia em dois lugares (o seed do painel e o fallback do
 * gerador), e os dois podiam divergir sem ninguém notar — foi por isso que
 * desligar um passo no banco não impedia o envio. Agora o painel e o fallback
 * leem daqui.
 *
 * ── Posicionamento (AGENTS.md, permanente) ────────────────────────────────
 * Nenhum e-mail expõe preço por m² nem compara preço de superfície. A defesa do
 * PFB (Placa de Fibra de Bambu) é por CUSTO TOTAL DE APLICAÇÃO e pelos
 * diferenciais: durabilidade, baixa absorção, instalação a seco, dispensa de
 * preparo/estrutura/marcenaria. Foi o erro do e-mail antigo, que mostrava
 * R$ 295/m² acima de "convencionais custam R$ 80 a R$ 250/m²".
 *
 * ── Tokens disponíveis ────────────────────────────────────────────────────
 * firstName · clientName · spaceLabel · spacePara · spaceEm · spaceSubj
 * model · finish · plates · area · total · partnerFirst · partnerName
 * waLink · quoteCard · quoteLink · productImages
 */

export interface DripStep {
  step_number: number;
  /** Dias de espera DEPOIS deste passo até o próximo. */
  delay_days: number;
  description: string;
  subject: string;
  body_html: string;
}

// ── Blocos reutilizados ──────────────────────────────────────────────────────
const P = (t: string) =>
  `<p style="color:#43474e;font-size:14px;line-height:1.85;margin:0 0 18px;font-family:Arial,sans-serif;">${t}</p>`;

const H = (t: string) =>
  `<p style="font-size:19px;color:#002045;font-weight:700;margin:0 0 22px;line-height:1.4;font-family:Arial,sans-serif;">${t}</p>`;

const CTA = (label: string) => `
<table cellpadding="0" cellspacing="0" style="margin:30px 0 6px;">
  <tr><td style="background:#002045;">
    <a href="{{waLink}}" style="display:inline-block;padding:16px 34px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;font-family:Arial,sans-serif;">${label}</a>
  </td></tr>
</table>`;

/** Linha de dado técnico — sóbria, sem ícone nem exclamação. */
const SPEC = (label: string, value: string) => `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #ececec;color:#74777f;font-size:12px;font-family:Arial,sans-serif;vertical-align:top;width:42%;">${label}</td>
    <td style="padding:14px 0;border-bottom:1px solid #ececec;color:#002045;font-size:13px;font-family:Arial,sans-serif;font-weight:700;">${value}</td>
  </tr>`;

const SPECS = (rows: string) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 26px;">${rows}</table>`;

const QUIET = (t: string) =>
  `<p style="color:#74777f;font-size:12px;line-height:1.7;margin:22px 0 0;font-family:Arial,sans-serif;">${t}</p>`;

export const DRIP_STEPS: DripStep[] = [
  // ── Dia 0 ──────────────────────────────────────────────────────────────────
  {
    step_number: 1,
    delay_days: 4,
    description: "Confirmação do orçamento",
    subject: "Seu orçamento Orbital — {{spaceLabel}}",
    body_html: `
${H("{{firstName}}, seu orçamento está registrado.")}
${P("Obrigado pelo interesse na Orbital. Abaixo está o detalhamento do seu projeto para {{spacePara}}, com os painéis {{model}}.")}
{{quoteCard}}
{{quoteLink}}
{{productImages}}
${P("Trabalhamos com <strong>PFB — Placa de Fibra de Bambu</strong>: um revestimento de grande formato, produzido a partir de fibra de bambu renovável, com pronta-entrega em Manaus.")}
${P("Nos próximos dias enviaremos o essencial sobre o material — composição, comportamento em ambientes úmidos e como é a aplicação. Sem pressa e sem insistência.")}
${CTA("Falar com um consultor")}
${QUIET("Se preferir tratar diretamente, basta responder a este e-mail.")}
`,
  },

  // ── Dia 4 ──────────────────────────────────────────────────────────────────
  {
    step_number: 2,
    delay_days: 6,
    description: "O material e o formato",
    subject: "{{firstName}}, sobre o material do seu projeto",
    body_html: `
${H("O que é a Placa de Fibra de Bambu.")}
${P("A PFB é composta por fibra de bambu — matéria-prima renovável, de crescimento rápido — prensada em placas de grande formato. É o mesmo material que a Orbital fornece para showrooms, escritórios e residências em Manaus.")}
${SPECS(
  SPEC("Dimensão da placa", "2,90 × 1,20 m") +
  SPEC("Espessura", "5 mm") +
  SPEC("Peso", "Aproximadamente 11 kg por placa") +
  SPEC("Composição", "Fibra de bambu, sem formaldeído"),
)}
${P("O formato é o que muda a percepção do ambiente. Revestimentos convencionais trabalham em peças de 60 a 90 cm, o que multiplica as emendas em qualquer parede. Uma única placa Orbital cobre 3,48 m² sem interrupção.")}
${P("Menos emendas significa menos linhas cortando a superfície — e, na prática, menos pontos por onde umidade e sujeira se instalam ao longo dos anos.")}
${CTA("Ver disponibilidade")}
`,
  },

  // ── Dia 10 ─────────────────────────────────────────────────────────────────
  {
    step_number: 3,
    delay_days: 7,
    description: "Durabilidade e comportamento em Manaus",
    subject: "{{firstName}}, como o PFB se comporta na umidade de Manaus",
    body_html: `
${H("Feito para o clima daqui.")}
${P("Manaus impõe a revestimentos uma condição que poucos materiais sustentam: umidade alta o ano inteiro. É onde a maioria dos acabamentos começa a falhar — inchamento, descolamento, mofo nas emendas.")}
${SPECS(
  SPEC("Absorção de umidade", "0,2% em 48 horas — o MDF absorve cerca de 35%") +
  SPEC("Mofo e cupim", "Resistente") +
  SPEC("Comportamento ao fogo", "Não propaga chama") +
  SPEC("Emissão", "Livre de formaldeído") +
  SPEC("Aplicação", "Paredes e tetos, inclusive áreas úmidas"),
)}
${P("São esses números que sustentam a aplicação em banheiros, lavabos e cozinhas — ambientes onde revestimentos à base de madeira simplesmente não duram.")}
${P("Com a manutenção adequada, os painéis acompanham a vida útil do imóvel. Não é um acabamento que entra no ciclo de troca a cada oito ou dez anos.")}
${CTA("Conversar sobre o projeto")}
`,
  },

  // ── Dia 17 ─────────────────────────────────────────────────────────────────
  {
    step_number: 4,
    delay_days: 6,
    description: "A instalação e o que ela dispensa",
    subject: "{{firstName}}, a obra que o seu projeto não vai precisar",
    body_html: `
${H("Instalação a seco, com o ambiente em uso.")}
${P("A aplicação do PFB é feita diretamente sobre a superfície existente — reboco, tinta ou cerâmica. Sem demolição, sem poeira e sem interditar o ambiente.")}
${SPECS(
  SPEC("Tempo por ambiente", "2 a 3 horas, em média") +
  SPEC("Preparo de superfície", "Não é necessário na maioria dos casos") +
  SPEC("Estrutura ou marcenaria", "Dispensadas") +
  SPEC("Durante a obra", "O ambiente pode seguir em uso"),
)}
${P("É aqui que o cálculo de um projeto muda de figura. Um sistema convencional raramente termina no material: soma preparo de superfície, estrutura, marcenaria, mão de obra especializada, tempo de execução e acabamento — e volta a somar tudo de novo na primeira troca.")}
${P("Com o PFB, boa parte dessas etapas simplesmente não existe. O projeto sai do papel e fica pronto no mesmo dia.")}
${CTA("Falar com um consultor")}
`,
  },

  // ── Dia 23 ─────────────────────────────────────────────────────────────────
  {
    step_number: 5,
    delay_days: 7,
    description: "Pronta-entrega e disponibilidade",
    subject: "{{firstName}}, sobre a disponibilidade do {{model}}",
    body_html: `
${H("Pronta-entrega em Manaus.")}
${P("A Orbital mantém estoque próprio na cidade justamente para que um projeto não dependa de importação nem de prazo de fábrica. Aprovou, leva.")}
${P("Vale explicar como isso funciona na prática. Atendemos arquitetos, marcenarias e construtoras em projetos de grande metragem — e um único projeto pode absorver uma parte relevante de um acabamento específico. Por isso o estoque é planejado por modelo, e a composição de cada acabamento varia ao longo do mês.")}
${P("Também por isso <strong>não trabalhamos com reserva de material</strong>: as placas são atribuídas no momento do pedido. É o que garante que quem fecha hoje receba hoje, sem material parado em nome de alguém que ainda está decidindo.")}
${P("Seu orçamento continua válido e podemos confirmar a disponibilidade atual do {{model}} a qualquer momento — leva um minuto.")}
${CTA("Confirmar disponibilidade")}
${QUIET("Se preferir outro acabamento, temos {{plates}} placas configuradas no seu projeto e podemos simular alternativas com disponibilidade imediata.")}
`,
  },

  // ── Dia 30 ─────────────────────────────────────────────────────────────────
  {
    step_number: 6,
    delay_days: 30,
    description: "Onde o PFB já está aplicado",
    subject: "{{firstName}}, onde o PFB Orbital já está instalado",
    body_html: `
${H("O material que você simulou já está em uso na cidade.")}
${P("O PFB Orbital está aplicado em showrooms de mobiliário de alto padrão, escritórios, embarcações e residências em Manaus — em paredes, tetos e áreas úmidas.")}
${P("Se ajudar na decisão, você pode ver o material pessoalmente antes de fechar: temos ambientes em exposição em showrooms parceiros, onde dá para tocar a superfície, avaliar o acabamento na luz do ambiente e conferir como as emendas se comportam em uma parede inteira.")}
${P("É uma decisão que se toma melhor de perto. Podemos indicar o showroom mais próximo de você.")}
${CTA("Agendar uma visita")}
${QUIET("Seu projeto: {{plates}} placa(s) de {{model}} para {{spacePara}}, cobrindo {{area}}.")}
`,
  },

  // ── Dia 60 ─────────────────────────────────────────────────────────────────
  {
    step_number: 7,
    delay_days: 0,
    description: "Encerramento cordial",
    subject: "{{firstName}}, seu projeto continua registrado conosco",
    body_html: `
${H("Sem pressa, {{firstName}}.")}
${P("Passaram-se cerca de dois meses desde a sua simulação para {{spacePara}}. Projetos de revestimento têm o tempo deles, e um bom projeto costuma esperar o momento certo — a obra, o orçamento da casa, a agenda do arquiteto.")}
${P("Esta é a última mensagem desta sequência. Seu projeto fica registrado conosco: quando quiser retomar, não será preciso recomeçar do zero.")}
${P("Se as condições mudaram — metragem, acabamento ou ambiente — refazemos a simulação com os valores e a disponibilidade do momento.")}
${CTA("Retomar quando fizer sentido")}
${QUIET("Obrigado pelo tempo que dedicou a conhecer a Orbital.")}
`,
  },
];

/** Dias de espera DEPOIS de cada passo — derivado da própria régua. */
export const DRIP_DELAYS: Record<number, number> = Object.fromEntries(
  DRIP_STEPS.filter((s) => s.delay_days > 0).map((s) => [s.step_number, s.delay_days]),
);

/** Dia em que cada passo é enviado, contado da criação do orçamento. */
export function dripSchedule(): Array<{ step: number; day: number; subject: string }> {
  let day = 0;
  return DRIP_STEPS.map((s) => {
    const at = day;
    day += s.delay_days;
    return { step: s.step_number, day: at, subject: s.subject };
  });
}

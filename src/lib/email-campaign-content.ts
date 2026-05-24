export interface CampaignContent {
  subject: string;
  previewText: string;
  htmlBody: string;
}

function buildEmail(
  subject: string,
  bodyHtml: string,
  ctaText: string,
  ctaUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0efec;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0efec;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;">

        <!-- HEADER -->
        <tr>
          <td style="background:#002045;padding:28px 36px;">
            <p style="margin:0;color:#ffffff;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">ORBITAL REVESTIMENTOS</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:0.1em;font-family:Arial,sans-serif;">Portal do Parceiro</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 36px 24px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 36px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#002045;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">${ctaText} &#8594;</a>
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr><td style="height:1px;background:#f0f0f0;"></td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 36px;background:#f8f8f6;">
            <p style="margin:0;color:#74777f;font-size:10px;line-height:1.6;font-family:Arial,sans-serif;">
              Ol&#225;, {{PARTNER_NAME}} &#8212; voc&#234; recebe este e-mail por ser parceiro Orbital (cup&#227;o: {{COUPON_CODE}}).<br>
              Para cancelar, entre em contato: contato@orbitalrevestimentos.com.br
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const CONTENT: Record<
  string,
  {
    subject: string;
    previewText: string;
    body: string;
    ctaText: string;
    ctaPath: string;
  }
> = {
  classic: {
    subject: "Uma placa. Dez anos. Zero manutenção.",
    previewText: "Conheça o PFB Classic — o acabamento mais vendido da Orbital.",
    ctaText: "Ver PFB Classic no site",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">PFB Classic &mdash; Mármore Fosco</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O revestimento mais vendido da Orbital chega ao seu cliente com a estética do mármore fosco sem nenhuma das dores de cabeça do mármore natural.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#002045;font-weight:700;">3,48 m² por placa &nbsp;·&nbsp; Instalação em 2&ndash;3 horas &nbsp;·&nbsp; Preço público: R$ 559/placa</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Ideal para: sala de estar, escritório, corredor e qualquer espaço que pede sofisticação sem obra pesada.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Seu cliente aplica em um único dia. Sem manutenção por décadas. É por isso que o Classic continua sendo a escolha número um entre arquitetos e designers em Manaus.</p>
    `,
  },
  brilliance: {
    subject: "O brilho do mármore, sem as rachaduras.",
    previewText: "PFB Brilliance — Mármore Polido para espaços de alto padrão.",
    ctaText: "Ver PFB Brilliance",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">PFB Brilliance &mdash; Mármore Polido</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Quando o projeto exige aquele acabamento polido de alto padrão, o Brilliance entrega sem comprometer a praticidade.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#002045;font-weight:700;">Superfície polida premium &nbsp;·&nbsp; Preço público: R$ 589/placa &nbsp;·&nbsp; 0,2% de absorção</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Ideal para: recepção corporativa, banheiro master, spa e ambientes de luxo onde o brilho faz parte do projeto.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Diferente do mármore natural, o Brilliance não racha, não mancha e não absorve umidade &mdash; perfeito para o clima de Manaus.</p>
    `,
  },
  elegance: {
    subject: "Calor de madeira. Resistência de bambu.",
    previewText: "PFB Elegance — Madeira Texturizada para ambientes aconchegantes.",
    ctaText: "Ver PFB Elegance",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">PFB Elegance &mdash; Madeira Texturizada</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O aconchego da madeira com a durabilidade do bambu comprimido. O Elegance transforma qualquer ambiente em refúgio.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#002045;font-weight:700;">Textura amadeirada natural &nbsp;·&nbsp; Preço público: R$ 649/placa &nbsp;·&nbsp; Base de bambu renovável</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Ideal para: quarto master, home office, espaços de leitura e ambientes onde o cliente quer calor humano sem abrir mão da resistência.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O bambu cresce de 5 a 7 vezes mais rápido que a madeira convencional e não contém formaldeído &mdash; argumento que seus clientes de alto padrão vão adorar.</p>
    `,
  },
  humidity: {
    subject: "Umidade em Manaus destrói 9 em cada 10 revestimentos.",
    previewText: "Saiba por que o PFB é o único revestimento preparado para o clima amazônico.",
    ctaText: "Compartilhe seu cupom",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">O problema que todo arquiteto em Manaus conhece.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">MDF absorve até 35% de umidade. Papel de parede descola em meses. Gesso umedece e forma bolor. No clima amazônico, a maioria dos revestimentos simplesmente não foi projetada para sobreviver.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:22px;color:#002045;font-weight:700;">0,2%</p>
        <p style="margin:0;font-size:13px;color:#74777f;">Taxa de absorção de umidade do PFB Orbital &mdash; impermeável por natureza.</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O PFB é fabricado com bambu comprimido e resina termofixada, criando uma barreira natural contra a umidade. Não incha. Não descola. Não apodrece.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Quando seu próximo cliente perguntar &ldquo;mas vai aguentar o calor?&rdquo;, você já tem a resposta.</p>
    `,
  },
  installation: {
    subject: "Seu cliente vai adorar isso: obra em 2 a 3 horas.",
    previewText: "Sem poeira, sem barulho, sem dias de obra. O PFB é instalado em uma manhã.",
    ctaText: "Simule um orçamento",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">Obra tradicional: dias de poeira e barulho.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Azulejo, gesso e alvenaria exigem mão de obra especializada, prazo de cura, sujeira e às vezes até ART estrutural. Para quem mora no imóvel, é um pesadelo.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#002045;font-weight:700;">PFB: instalação em 2&ndash;3 horas por cômodo &nbsp;·&nbsp; Sem obra molhada &nbsp;·&nbsp; Sem barulho excessivo &nbsp;·&nbsp; Sem ART para paredes</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O sistema encaixe PFB é plug &amp; play. O instalador chega de manhã, termina antes do almoço. O cliente não precisa sair do imóvel.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Ideal para reformas em imóveis ocupados, escritórios em operação e qualquer projeto onde o cliente valoriza velocidade e conveniência.</p>
    `,
  },
  fire: {
    subject: "Revestimento que não propaga chamas. Exigência de projetos comerciais.",
    previewText: "Norma NBR, certificação técnica e aprovação de engenharia. O PFB cumpre tudo.",
    ctaText: "Ver certificações",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">Segurança que vai além da estética.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Projetos comerciais e condomínios exigem materiais com resistência ao fogo comprovada. PVC e papel de parede propagam chamas. MDF carboniza rapidamente. O PFB não.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:14px;color:#002045;font-weight:700;">Certificação técnica:</p>
        <p style="margin:0;font-size:13px;color:#43474e;line-height:1.6;">ART n&ordm; AM20260593657 &nbsp;·&nbsp; Eng. Werksson Sousa &nbsp;·&nbsp; CREA 042030134-8-D<br>Conformidade com normas NBR de prevenção a incêndios</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Para projetos de hotéis, clínicas, academias, escritórios corporativos e condomínios residenciais, a certificação do PFB simplifica o processo de aprovação e diferencia seu projeto na apresentação ao cliente.</p>
    `,
  },
  eco: {
    subject: "Bambu renovável: o que seu cliente quer ouvir em 2026.",
    previewText: "O argumento de sustentabilidade que fecha projetos ESG.",
    ctaText: "Conheça a tecnologia PFB",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">Sustentabilidade que você pode mostrar no projeto.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Em 2026, clientes corporativos e incorporadoras exigem ESG. O bambu do PFB cresce de 5 a 7 vezes mais rápido que madeiras convencionais, é 100% renovável e não contém formaldeído.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#002045;font-weight:700;">Sem formaldeído &nbsp;·&nbsp; Base renovável &nbsp;·&nbsp; Reciclável &nbsp;·&nbsp; Pegada de carbono reduzida vs. MDF</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Para projetos de escritórios corporativos, espaços de coworking e condomínios que buscam certificação sustentável, o PFB entrega o argumento técnico e visual que seus clientes precisam ver na proposta.</p>
    `,
  },
  application: {
    subject: "Onde o PFB Orbital pode (e não pode) ser aplicado.",
    previewText: "Guia prático de aplicação para arquitetos e designers.",
    ctaText: "Dúvidas? Fale com a gente",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">Guia prático de aplicação do PFB.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Para especificar com segurança e evitar retrabalho, aqui está o resumo definitivo de onde o PFB pode e não pode ser aplicado.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#002045;font-weight:700;">&#10003; PODE:</p>
        <p style="margin:0 0 12px;font-size:13px;color:#43474e;line-height:1.7;">Paredes internas e externas &nbsp;·&nbsp; Forros com ART &nbsp;·&nbsp; Áreas molhadas (banheiro, lavabo) &nbsp;·&nbsp; Espaços comerciais &nbsp;·&nbsp; Condomínios residenciais</p>
        <p style="margin:0 0 8px;font-size:13px;color:#002045;font-weight:700;">&#10005; NÃO PODE:</p>
        <p style="margin:0;font-size:13px;color:#43474e;line-height:1.7;">Estrutura portante &nbsp;·&nbsp; Submerso (piscinas, tanques) &nbsp;·&nbsp; Contato direto com solo &nbsp;·&nbsp; Pisos de alto tráfego sem especificação</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Ficou com alguma dúvida de especificação? Nossa equipe técnica responde em até 24 horas.</p>
    `,
  },
  commission: {
    subject: "Como você ganha mais indicando mais clientes — um guia prático.",
    previewText: "Dicas para maximizar suas comissões com o Portal do Parceiro.",
    ctaText: "Ver seu painel de comissões",
    ctaPath: "/parceiro",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">Mais indicações, mais comissão. Veja como.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Cada vez que um cliente seu usa seu cupom no simulador da Orbital, você gera uma comissão. Quanto mais projetos, mais você ganha &mdash; sem teto.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:14px;color:#002045;font-weight:700;">Perfis de cliente com maior conversão:</p>
        <p style="margin:0;font-size:13px;color:#43474e;line-height:1.8;">&#8226; Arquitetos com projetos residenciais em zonas úmidas de Manaus<br>&#8226; Designers de interiores em apartamentos de alto padrão<br>&#8226; Clínicas, academias e espaços comerciais em reforma<br>&#8226; Construtoras entregando unidades com acabamento incluso</p>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Acompanhe cada uso, orçamento e comissão em tempo real no seu painel.</p>
    `,
  },
  comparison: {
    subject: "PFB vs. MDF: o que seus clientes precisam saber antes de decidir.",
    previewText: "Comparativo técnico que fecha a venda antes de chegar na concorrência.",
    ctaText: "Compare no site",
    ctaPath: "/",
    body: `
      <p style="font-size:26px;line-height:1.2;color:#002045;font-weight:700;margin:0 0 16px;">PFB vs. MDF: a comparação que fecha a decisão.</p>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">Quando o cliente compara preço, ele esquece de comparar durabilidade. Mostre os números antes que a concorrência apareça.</p>
      <div style="background:#eef2f8;border-left:3px solid #002045;padding:14px 18px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:12px;">
          <tr>
            <td style="padding:6px 0;color:#74777f;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;width:40%;">Critério</td>
            <td style="padding:6px 8px;color:#74777f;font-weight:700;text-align:center;">MDF</td>
            <td style="padding:6px 8px;color:#002045;font-weight:700;text-align:center;">PFB Orbital</td>
          </tr>
          <tr style="border-top:1px solid #e2e2e2;">
            <td style="padding:8px 0;color:#43474e;">Absorção de umidade</td>
            <td style="padding:8px;color:#dc2626;text-align:center;font-weight:700;">35%</td>
            <td style="padding:8px;color:#16a34a;text-align:center;font-weight:700;">0,2%</td>
          </tr>
          <tr style="border-top:1px solid #e2e2e2;">
            <td style="padding:8px 0;color:#43474e;">Durabilidade em Manaus</td>
            <td style="padding:8px;color:#dc2626;text-align:center;">2&ndash;3 anos</td>
            <td style="padding:8px;color:#16a34a;text-align:center;font-weight:700;">10+ anos</td>
          </tr>
          <tr style="border-top:1px solid #e2e2e2;">
            <td style="padding:8px 0;color:#43474e;">Instalação</td>
            <td style="padding:8px;color:#74777f;text-align:center;">Dias</td>
            <td style="padding:8px;color:#16a34a;text-align:center;font-weight:700;">2&ndash;3 horas</td>
          </tr>
          <tr style="border-top:1px solid #e2e2e2;">
            <td style="padding:8px 0;color:#43474e;">Formaldeído</td>
            <td style="padding:8px;color:#dc2626;text-align:center;">Sim</td>
            <td style="padding:8px;color:#16a34a;text-align:center;font-weight:700;">Não</td>
          </tr>
        </table>
      </div>
      <p style="font-size:15px;line-height:1.7;color:#43474e;margin:16px 0;">O PFB custa mais na placa, mas custa menos no ciclo de vida. Mostre esse argumento ao seu cliente e feche com mais margem.</p>
    `,
  },
};

export function generateCampaignContent(
  subtype: string,
  _partnerName: string,
  _couponCode: string,
  siteUrl: string,
): CampaignContent {
  const c = CONTENT[subtype];
  if (!c) throw new Error(`Unknown campaign subtype: ${subtype}`);

  const ctaUrl = `${siteUrl}${c.ctaPath}`;
  const htmlBody = buildEmail(c.subject, c.body, c.ctaText, ctaUrl);

  return {
    subject: c.subject,
    previewText: c.previewText,
    htmlBody,
  };
}

export const PRODUCT_SUBTYPES = ["classic", "brilliance", "elegance"] as const;
export const EDUCATIONAL_SUBTYPES = [
  "humidity",
  "installation",
  "fire",
  "eco",
  "application",
  "commission",
  "comparison",
] as const;

export function getNextCampaignRotation(existingCount: number): {
  campaignType: "product" | "educational";
  campaignSubtype: string;
} {
  const isProduct = existingCount % 2 === 0;
  if (isProduct) {
    const productIdx = Math.floor(existingCount / 2) % PRODUCT_SUBTYPES.length;
    return { campaignType: "product", campaignSubtype: PRODUCT_SUBTYPES[productIdx] };
  } else {
    const eduIdx = Math.floor((existingCount + 1) / 2) % EDUCATIONAL_SUBTYPES.length;
    return { campaignType: "educational", campaignSubtype: EDUCATIONAL_SUBTYPES[eduIdx] };
  }
}

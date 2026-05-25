import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// ─── Default templates ───────────────────────────────────────────────────────

const DEFAULT_STEPS = [
  {
    step_number: 1,
    delay_days: 3,
    description: "Confirmação imediata do orçamento",
    subject: "Seu orçamento Orbital está pronto, {{firstName}}",
    body_html: `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">{{firstName}},</p>
<p style="font-size:26px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">seu orçamento está pronto.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">{{partnerFirst}} preparou esta simulação especialmente para {{spaceLabel}}. Abaixo estão todos os detalhes do seu projeto com os painéis <strong>{{model}}</strong> em acabamento {{finish}}:</p>
{{quoteCard}}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:20px 0 12px;font-family:Arial,sans-serif;">Nos próximos dias vamos te enviar mais informações sobre o que torna a Orbital diferente de tudo o que você já viu em revestimentos — incluindo os detalhes técnicos que fazem toda a diferença em um projeto.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida, fale diretamente com {{partnerFirst}}:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Este orçamento foi preparado com base na sua simulação e pode ser ajustado a qualquer momento. Os preços são válidos conforme disponibilidade de estoque.</p>
`,
  },
  {
    step_number: 2,
    delay_days: 2,
    description: "O que há por trás de cada painel",
    subject: "{{firstName}}, o que ninguém te conta sobre revestimentos",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Existe um motivo pelo qual arquitetos escolhem Orbital.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Olá, {{firstName}}. Há alguns dias você simulou um orçamento para {{spaceLabel}}. Antes de você decidir — queremos que você entenda exatamente o que está comprando.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">A maioria dos revestimentos no mercado mede entre 60×60cm e 90×90cm. Os painéis Orbital medem <strong>2,9m × 1,2m</strong>. Isso não é apenas um número diferente — é uma experiência completamente diferente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Muito menos emendas</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">Cada painel Orbital cobre 3,48 m². Um painel convencional de 60×60 cobre 0,36 m². Isso significa até 10× menos rejuntamento — e um visual infinitamente mais limpo.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Acabamento {{finish}}</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">O modelo {{model}} foi desenvolvido para ambientes que recusam o ordinário. Resistente a impactos, fácil de limpar, e com uma estética que não envelhece com tendências.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">5mm de espessura</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">Calculada para fixação perfeita e resistência ao uso intenso ao longo de décadas — sem o risco de fissuras e descolamentos comuns em materiais mais finos.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Instalação mais rápida</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">Menos peças para assentar = menos tempo de obra, menos argamassa, menos desgaste no seu projeto. O que levaria semanas pode ser feito em dias.</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">O modelo <strong>{{model}}</strong> que você simulou cobre <strong>{{area}}</strong> de {{spaceLabel}} com apenas {{plates}} painel(is). Isso é um ambiente inteiro, transformado.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="https://orbitalrevestimentos.com.br/produtos" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Ver catálogo completo</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Tem alguma dúvida técnica? <a href="{{waLink}}" style="color:#002045;text-decoration:underline;">Fale com {{partnerFirst}} pelo WhatsApp.</a></p>
`,
  },
  {
    step_number: 3,
    delay_days: 4,
    description: "Visualização do espaço",
    subject: "Imagine {{spaceLabel}} assim, {{firstName}}",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Feche os olhos por um segundo, {{firstName}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Imagine entrar em {{spaceLabel}} e se deparar com {{area}} de painéis {{model}} no acabamento {{finish}}. Superfícies amplas sem interrupção. Um visual que faz o ambiente parecer maior, mais sofisticado, mais <em>intencional</em>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#002045;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que muda visualmente em {{spaceLabel}}:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Continuidade visual</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Sem quebras a cada 60cm. O olho percorre o ambiente sem interrupção — é a diferença entre um espaço comum e um espaço projetado.</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Percepção de amplitude</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Painéis grandes criam a ilusão óptica de mais espaço. Mesmo ambientes menores parecem maiores com esse formato.</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Personalidade própria</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">O acabamento {{finish}} traz profundidade e textura que revestimentos convencionais simplesmente não conseguem replicar.</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="4" style="background:#002045;"></td>
        <td style="padding:0 0 0 16px;">
          <p style="margin:0 0 4px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Facilidade de limpeza</p>
          <p style="margin:0;color:#74777f;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Menos rejunte significa muito menos acúmulo de umidade, mofo e sujeira. Manutenção de minutos, não de horas.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Quer ver esses painéis ao vivo antes de decidir? Nosso showroom em Manaus está disponível — {{partnerFirst}} pode agendar um horário conveniente para você.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Agendar visita com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
`,
  },
  {
    step_number: 4,
    delay_days: 3,
    description: "O investimento que se justifica",
    subject: "{{firstName}}, veja o que {{total}} realmente compra",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">{{firstName}}, vamos falar sobre o investimento.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Seu orçamento ficou em <strong>{{total}}</strong>. Antes de tomar uma decisão, vale colocar esse número em perspectiva — porque quando você faz a conta certa, o número muda completamente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#f0f9eb;border-left:3px solid #3b6934;padding:20px 20px;">
      <p style="margin:0 0 4px;color:#3b6934;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Custo por m²</p>
      <p style="margin:0;color:#002045;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">{{perM2}}</p>
      <p style="margin:4px 0 0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">Para {{area}} de {{spaceLabel}}</p>
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#eef2f8;border-left:3px solid #002045;padding:20px 20px;">
      <p style="margin:0 0 4px;color:#002045;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Custo por dia*</p>
      <p style="margin:0;color:#002045;font-size:26px;font-weight:700;font-family:Arial,sans-serif;">{{perDay}}</p>
      <p style="margin:4px 0 0;color:#74777f;font-size:11px;font-family:Arial,sans-serif;">*Dividido por 20 anos de uso</p>
    </td>
  </tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">Revestimentos convencionais de qualidade custam entre R$ 80 e R$ 250/m² — e exigem trocas em 8 a 12 anos. Os painéis Orbital, com a manutenção adequada, duram a vida útil do imóvel.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Essa não é uma despesa de decoração. É uma decisão de infraestrutura — que você vai olhar todos os dias por décadas.</p>
{{quoteCard}}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Pronto para garantir este orçamento? {{partnerFirst}} está disponível:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Confirmar com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
`,
  },
  {
    step_number: 5,
    delay_days: 4,
    description: "Excelência técnica e durabilidade",
    subject: "{{firstName}}, o que acontece com os painéis Orbital em 10 anos?",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">O teste do tempo, {{firstName}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Existe uma pergunta que poucos fazem antes de reformar: <em>"Como isso vai parecer em 10 anos?"</em></p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Com revestimentos convencionais, a resposta costuma ser: rejunte escurecido, peças descoladas, padrão fora de moda. Com os painéis Orbital — a resposta é diferente.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Superfície sem rejunte excessivo</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">Menos rejunte = menos ponto de entrada para umidade, mofo e deterioração. A superfície se mantém limpa e intacta por muito mais tempo.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Acabamento {{finish}} que não oxida</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">O processo de fabricação garante que a textura e a cor do modelo {{model}} se mantenham estáveis — sem amarelamento, sem desbotamento, sem perda de brilho.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Resistência a impactos cotidianos</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">5mm de espessura com material de alta densidade. Os painéis suportam o uso intenso de ambientes residenciais e comerciais sem fissurar.</p>
  </td></tr>
  <tr><td style="padding:16px 0;border-bottom:1px solid #f0f0f0;">
    <p style="margin:0 0 6px;color:#002045;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Instalação que não faz concessões</p>
    <p style="margin:0;color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;">Quando instalado corretamente, o sistema de fixação dos painéis Orbital é permanente. Não há recalque, não há ondulação, não há descolamento com o tempo.</p>
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbea;border:1px solid #e6c84a;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 8px;color:#6b5000;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Manutenção simples que preserva tudo:</p>
    <p style="margin:0 0 6px;color:#6b5000;font-size:13px;font-family:Arial,sans-serif;">· Pano úmido com detergente neutro — semanal</p>
    <p style="margin:0 0 6px;color:#6b5000;font-size:13px;font-family:Arial,sans-serif;">· Evitar produtos abrasivos e ácidos</p>
    <p style="margin:0 0 6px;color:#6b5000;font-size:13px;font-family:Arial,sans-serif;">· Nenhuma selagem periódica necessária</p>
    <p style="margin:0 0 6px;color:#6b5000;font-size:13px;font-family:Arial,sans-serif;">· Sem retoques, pintura ou rejuntamento no futuro</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Seu orçamento de <strong>{{total}}</strong> para {{spaceLabel}} ainda está disponível. Fale com {{partnerFirst}}:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
`,
  },
  {
    step_number: 6,
    delay_days: 3,
    description: "O custo de não agir",
    subject: "{{firstName}}, uma pergunta honesta sobre {{spaceLabel}}",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Uma pergunta honesta, {{firstName}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Já faz mais de duas semanas desde que você simulou o orçamento para {{spaceLabel}}. E queremos te fazer uma pergunta direta:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:300;line-height:1.6;font-family:Arial,sans-serif;text-align:center;font-style:italic;">"Se eu não fizer isso agora, quando vou fazer?"</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 16px;font-family:Arial,sans-serif;">Reformas e projetos de revestimento são daquelas decisões que ficam na gaveta por meses — às vezes anos. E cada mês que passa, {{spaceLabel}} continua como está. Não transformado. Não do jeito que você imaginou.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Não estamos aqui para criar pressão artificial. Estamos aqui para lembrar que você já tomou 80% da decisão quando fez a simulação. Você escolheu o modelo. Você calculou a área. Você viu o número.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#002045;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">O que fica para trás se você adiar mais:</p>
    <p style="margin:0 0 8px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">→ Cada mês que passa, {{spaceLabel}} permanece como está — não do jeito que você quer</p>
    <p style="margin:0 0 8px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">→ Disponibilidade de estoque não é garantida indefinidamente</p>
    <p style="margin:0 0 8px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">→ Projetos de obra têm janelas de oportunidade — coordenar agora é mais fácil</p>
    <p style="margin:0 0 8px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">→ A transformação que você imaginou continua sendo apenas imaginação</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Se estiver pronto para dar o próximo passo — ou se ainda tiver alguma dúvida — fale com {{partnerFirst}}. Sem pressão, só clareza.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com {{partnerFirst}} agora</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Seu orçamento: <strong>{{total}}</strong> · {{plates}} painel(is) {{model}} · {{area}}</p>
`,
  },
  {
    step_number: 7,
    delay_days: 3,
    description: "Última mensagem",
    subject: "Esta é nossa última mensagem, {{firstName}}",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">{{firstName}}, esta é a nossa última mensagem.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Nas últimas três semanas, compartilhamos tudo que achamos importante sobre os painéis Orbital — o produto, o investimento, a durabilidade, a transformação que {{spaceLabel}} poderia ter.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Agora a decisão é completamente sua. E qualquer que seja, nós respeitamos.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td width="48%" style="background:#f0f9eb;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se você disser sim:</p>
      <p style="margin:0 0 6px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ {{area}} de {{spaceLabel}} transformados</p>
      <p style="margin:0 0 6px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ Visual único que dura décadas</p>
      <p style="margin:0 0 6px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ Decisão que você vai se orgulhar</p>
      <p style="margin:0 0 6px;color:#43474e;font-size:12px;font-family:Arial,sans-serif;">✓ Suporte completo de {{partnerFirst}}</p>
    </td>
    <td width="4%"></td>
    <td width="48%" style="background:#fff5f5;padding:20px;vertical-align:top;">
      <p style="margin:0 0 12px;color:#c0392b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">Se você disser não agora:</p>
      <p style="margin:0 0 6px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· {{spaceLabel}} continua como está</p>
      <p style="margin:0 0 6px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· A transformação fica para outra hora</p>
      <p style="margin:0 0 6px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· O orçamento pode mudar com o estoque</p>
      <p style="margin:0 0 6px;color:#74777f;font-size:12px;font-family:Arial,sans-serif;">· Mas a porta Orbital nunca fecha</p>
    </td>
  </tr>
</table>
{{quoteCard}}
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:24px 0 4px;font-family:Arial,sans-serif;">Se este for o momento certo, {{partnerFirst}} está à disposição:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Fechar com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Não enviaremos mais mensagens sobre este orçamento após hoje. Quando estiver pronto — seja em dias ou meses — é só entrar em contato. Obrigado pela atenção, {{firstName}}.</p>
`,
  },
  {
    step_number: 99,
    delay_days: null,
    description: "Enviado ao concluir (venda fechada)",
    subject: "Bem-vindo à família Orbital, {{firstName}}!",
    body_html: `
<p style="font-size:26px;color:#002045;font-weight:700;margin:0 0 6px;font-family:Arial,sans-serif;">{{firstName}},</p>
<p style="font-size:26px;color:#002045;font-weight:300;margin:0 0 24px;font-family:Arial,sans-serif;">você fez a escolha certa.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Estamos muito felizes em recebê-lo como cliente Orbital. Seu projeto para {{spaceLabel}} com os painéis <strong>{{model}} · {{finish}}</strong> vai ficar extraordinário — e você vai entender exatamente o porquê quando vir o resultado final.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9eb;border-left:3px solid #3b6934;margin:24px 0;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#3b6934;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-family:Arial,sans-serif;">O que acontece agora:</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">1.</strong> {{partnerFirst}} vai confirmar todos os detalhes do pedido com você</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">2.</strong> Verificação de disponibilidade de estoque e prazo estimado</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">3.</strong> Agendamento da retirada ou logística no depósito Orbital</p>
    <p style="margin:0 0 10px;color:#43474e;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;"><strong style="color:#002045;">4.</strong> Instalação — podemos indicar profissionais parceiros em Manaus</p>
  </td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;margin:24px 0;">
  <tr><td style="padding:20px 24px;">
    <p style="margin:0 0 12px;color:#002045;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">Cuidado simples que preserva seus painéis por décadas:</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Pano úmido com detergente neutro — semanal</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Sem produtos abrasivos, ácidos ou solventes</p>
    <p style="margin:0 0 6px;color:#74777f;font-size:13px;font-family:Arial,sans-serif;">· Nenhuma manutenção especial necessária além da limpeza regular</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 4px;font-family:Arial,sans-serif;">Qualquer dúvida durante o processo — instalação, logística, especificações — fale com {{partnerFirst}}:</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com {{partnerFirst}}</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:13px;line-height:1.7;font-family:Arial,sans-serif;font-style:italic;">Obrigado por escolher a Orbital, {{firstName}}. Cada painel que instalamos é um projeto em que acreditamos.</p>
`,
  },
  {
    step_number: 98,
    delay_days: null,
    description: "Enviado ao cancelar",
    subject: "Obrigado por considerar a Orbital, {{firstName}}",
    body_html: `
<p style="font-size:20px;color:#002045;font-weight:700;margin:0 0 24px;font-family:Arial,sans-serif;">Obrigado, {{firstName}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Sabemos que o momento certo para um projeto nem sempre é agora — e isso é completamente válido. Ficamos felizes que você tenha dedicado tempo para conhecer os painéis Orbital e simular um orçamento para {{spaceLabel}}.</p>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 24px;font-family:Arial,sans-serif;">Não vamos te mandar mais mensagens sobre este projeto. Mas queremos deixar uma coisa registrada:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#002045;margin:24px 0;">
  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,sans-serif;">O que fica guardado para você:</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Modelo {{model}} · {{finish}}</p>
    <p style="margin:0 0 8px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· {{plates}} painel(is) · {{area}} de {{spaceLabel}}</p>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:13px;font-family:Arial,sans-serif;">· Referência: {{total}}</p>
    <p style="margin:0;color:rgba(255,255,255,0.55);font-size:12px;font-family:Arial,sans-serif;line-height:1.6;">Quando o momento chegar — seja em semanas ou meses — {{partnerFirst}} estará disponível para retomar exatamente de onde paramos. Sem precisar recalcular tudo do zero.</p>
  </td></tr>
</table>
<p style="color:#43474e;font-size:14px;line-height:1.8;margin:0 0 20px;font-family:Arial,sans-serif;">Nenhuma pressão, nenhum julgamento. Quando estiver pronto, é só falar.</p>
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:#002045;padding:0;">
      <a href="{{waLink}}" style="display:inline-block;padding:16px 32px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">Falar com {{partnerFirst}} quando estiver pronto</a>
    </td>
  </tr>
</table>
<p style="color:#74777f;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">Esta é a última mensagem que enviaremos sobre este orçamento. Obrigado pela atenção — foi um prazer.</p>
`,
  },
];

// ─── Route handlers ──────────────────────────────────────────────────────────

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("email_campaign_steps")
    .select("*")
    .order("step_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "seed") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("email_campaign_steps")
    .upsert(
      DEFAULT_STEPS.map((s) => ({ ...s, updated_at: new Date().toISOString() })),
      { onConflict: "step_number" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ seeded: DEFAULT_STEPS.length });
}

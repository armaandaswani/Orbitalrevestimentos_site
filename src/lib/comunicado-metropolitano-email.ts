/**
 * Comunicado: a Orbital agora faz parte do Núcleo Metropolitano.
 *
 * E-mail único (não é da campanha semanal), para arquitetos — parceiros ou não.
 * Aprovado pelo dono em mockup (out/2026). Regras:
 *  - Sem link de descadastro (decisão do dono).
 *  - Nunca citar concorrentes nem outros materiais (AGENTS.md).
 *  - Fontes: Arial nos textos, Georgia nos títulos.
 *  - Imagens em PNG/JPG (e-mail não aceita SVG) em public/images/email — nome
 *    de arquivo novo se mudar alguma (cache de 1 ano).
 * O logo do Metropolitano é o oficial, do site nucleometropolitano.com.br.
 */

const SITE = "https://orbitalrevestimentos.com.br";
const IMG = `${SITE}/images`;

export const COMUNICADO_METROPOLITANO_ASSUNTO = "A Orbital agora faz parte do Núcleo Metropolitano";

const SELOS: [string, string, string][] = [
  ["agua", "Resistente à água", "Água, umidade e mofo"],
  ["pragas", "Protegido contra pragas", "Cupins e outras pragas"],
  ["chamas", "Não propaga chamas", "Retardante de chamas"],
  ["pu", "Instalação rápida", "Prática, com cola PU"],
  ["eco", "Materiais ecológicos", "Fibra de bambu renovável"],
  ["flex", "Flexível e durável", "Paredes e forros internos"],
];

const celula = ([img, t, d]: [string, string, string]) => `<td width="33%" align="center" valign="top" style="padding:0 6px 26px;">
        <img src="${IMG}/email/pfb-icone-${img}-email.png" width="48" height="48" alt="" style="display:block;border:0;width:48px;height:48px;margin:0 auto 10px;">
        <p style="margin:0 0 3px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.35;font-weight:700;color:#0B1F45;">${t}</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#74777f;">${d}</p>
      </td>`;

export function comunicadoMetropolitanoHtml(): string {
  const icones = [SELOS.slice(0, 3), SELOS.slice(3)]
    .map((linha) => `<tr>${linha.map(celula).join("")}</tr>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>A Orbital agora faz parte do Núcleo Metropolitano</title>
<style>
  @media (max-width:600px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .h1{font-size:26px!important}
    .lk{display:block!important;padding:0 0 18px!important;text-align:center!important}
    .lk img{margin:0 auto!important}
    .lkd{display:none!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#EFEDE8;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#EFEDE8;">A fornecedora direta do Painel Flexível Fibra de Bambu em Manaus agora é parceira do Metropolitano.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEDE8;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">

  <!-- Cabeçalho -->
  <tr><td align="center" style="background:#0B1F45;padding:34px 40px;">
    <img src="${IMG}/brand/orbital-assinatura-negativo-email.png" width="168" height="53" alt="Orbital Revestimentos" style="display:block;border:0;width:168px;height:53px;">
  </td></tr>

  <!-- Anúncio -->
  <tr><td class="px" align="center" style="padding:52px 56px 18px;">
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;color:#2347A0;">Comunicado</p>
    <h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.25;font-weight:400;color:#0B1F45;">A Orbital agora faz parte do<br><em>Núcleo Metropolitano.</em></h1>
  </td></tr>

  <!-- Assinaturas lado a lado -->
  <tr><td align="center" style="padding:26px 40px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td class="lk" valign="middle" style="padding-right:26px;"><img src="${IMG}/brand/orbital-assinatura-email.png" width="150" height="47" alt="Orbital Revestimentos" style="display:block;border:0;width:150px;height:47px;"></td>
      <td class="lkd" valign="middle" style="width:1px;background:#d8d5cf;font-size:0;line-height:0;">&nbsp;</td>
      <td class="lk" valign="middle" style="padding-left:26px;"><img src="${IMG}/email/nucleo-metropolitano.png" width="186" height="40" alt="Metropolitano" style="display:block;border:0;width:186px;height:40px;"></td>
    </tr></table>
  </td></tr>

  <tr><td class="px" style="padding:30px 56px 44px;">
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#43474e;">Temos a satisfação de anunciar que a <strong style="color:#0B1F45;">Orbital Revestimentos</strong> agora faz parte do <strong style="color:#0B1F45;">Núcleo Metropolitano</strong>.</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#43474e;">O Metropolitano promove experiências com conteúdo técnico e cultural, como viagens, palestras e workshops. Conecta empresas parceiras aos profissionais, vivenciando as novidades do mercado e gerando a possibilidade de novos e melhores negócios.</p>
  </td></tr>

  <!-- Quem é a Orbital -->
  <tr><td class="px" style="background:#F6F5F2;padding:44px 56px 46px;border-top:1px solid #ece9e3;border-bottom:1px solid #ece9e3;">
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;color:#2347A0;">Quem somos</p>
    <h2 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;font-weight:400;color:#0B1F45;">Toda grande marca nasce <em>de uma convicção.</em></h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>
      <td style="width:3px;background:#36A35C;font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding-left:18px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.6;font-style:italic;color:#0B1F45;">A nossa: o mercado pede revestimentos inovadores e resistentes ao clima amazônico.</td>
    </tr></table>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#43474e;">Por isso aliamos anos de expertise em importação na ZFM à coragem de fazer diferente — e criamos a Orbital. Curadoria global, operação própria e customização para as necessidades manauaras, a serviço de revestimentos premium e disruptivos.</p>
    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:#43474e;">O <strong style="color:#0B1F45;">Painel Flexível Fibra de Bambu (PFB)</strong> é o primeiro. Em breve, chegam novidades.</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#74777f;">Fornecimento direto, estoque local e pronta-entrega em Manaus*.</p>
  </td></tr>

  <!-- O que é o PFB -->
  <tr><td class="px" align="center" style="padding:46px 40px 6px;">
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:700;color:#2347A0;">Conheça o produto</p>
    <h2 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.3;font-weight:400;color:#0B1F45;">Painel Flexível Fibra de Bambu</h2>
    <p style="margin:0 auto;max-width:440px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#43474e;">Revestimento de fibra de bambu renovável para paredes e forros internos — leve, flexível e feito para o clima úmido de Manaus.</p>
  </td></tr>
  <tr><td align="center" style="padding:18px 20px 4px;">
    <img src="${IMG}/email/pfb-leque-email.jpg" width="560" alt="Acabamentos do Painel Flexível Fibra de Bambu: mármores e madeira" style="display:block;border:0;width:100%;max-width:560px;height:auto;">
  </td></tr>

  <!-- Ícones -->
  <tr><td class="px" style="padding:18px 40px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${icones}
    </table>
  </td></tr>
  <tr><td align="center" style="padding:4px 40px 0;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#74777f;">Placa de <strong style="color:#0B1F45;">1,20 × 2,90 m</strong> · <strong style="color:#0B1F45;">5 mm</strong> de espessura · <strong style="color:#0B1F45;">3,48 m²</strong> por placa</p>
  </td></tr>

  <!-- Chamada -->
  <tr><td align="center" style="padding:34px 40px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="background:#0B1F45;"><a href="${SITE}/tecnologia" style="display:inline-block;padding:16px 34px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;color:#ffffff;text-decoration:none;">Conhecer o PFB</a></td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding:6px 40px 50px;">
    <a href="${SITE}/parcerias" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#2347A0;text-decoration:underline;">Conheça o programa de parcerias para arquitetos</a>
  </td></tr>

  <!-- Assinatura -->
  <tr><td class="px" align="center" style="padding:0 56px 46px;">
    <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;color:#0B1F45;">Instalado em horas. Admirado por anos.</p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#74777f;">Equipe Orbital Revestimentos</p>
  </td></tr>

  <!-- Rodapé -->
  <tr><td class="px" align="center" style="background:#0B1F45;padding:26px 40px;">
    <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#B4BBC8;">Orbital Revestimentos · Manaus, Amazonas<br>
      <a href="https://wa.me/5592988150149" style="color:#ffffff;text-decoration:none;">WhatsApp (92) 98815-0149</a> · <a href="https://instagram.com/orbitalrevestimentos" style="color:#ffffff;text-decoration:none;">@orbitalrevestimentos</a> · <a href="${SITE}" style="color:#ffffff;text-decoration:none;">orbitalrevestimentos.com.br</a></p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;color:#8a91a0;">Você recebe este e-mail por atuar com arquitetura e interiores em Manaus.<br>*Sujeito à disponibilidade de estoque.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
}

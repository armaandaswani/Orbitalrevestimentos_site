"use client";

import React, { useEffect, useMemo, useState } from "react";

type DocumentType = "orcamento" | "pedido" | "nota" | "recibo";

interface PedidoItem {
  id: string;
  product_name: string | null;
  plates: number;
  unit_price: number | null;
  unit_cost: number | null;
}

interface PedidoDocument {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  product_name: string | null;
  space: string | null;
  area_m2: number | null;
  total: number | null;
  notes: string | null;
  created_at: string;
  client_zip: string | null;
  client_address: string | null;
  client_address_complement: string | null;
  client_city: string | null;
  client_state: string | null;
  discount_amount: number | null;
  freight_amount: number | null;
  payment_methods: string[] | null;
  payment_terms: string | null;
  quote_valid_until: string | null;
  warranty_terms: string | null;
  document_notes: string | null;
  items?: PedidoItem[];
}

const COMPANY = {
  name: "Orbital Materiais de Construção LTDA",
  cnpj: "58.013.651/0001-04",
  address: "Avenida Visconde de Porto Alegre, 130, Sala 1 - Centro",
  city: "69010-125 - Manaus/AM",
  email: "orbitalrevestimentos@gmail.com",
};

const DOC_LABEL: Record<DocumentType, string> = {
  orcamento: "Orçamento",
  pedido: "Pedido de Venda",
  nota: "Nota de Venda",
  recibo: "Recibo",
};

const DEFAULT_NOTES =
  `CLÁUSULAS CONTRATUAIS - DISPOSIÇÕES GERAIS
ORBITAL REVESTIMENTOS

CLÁUSULA 1ª - DA NATUREZA DO FORNECIMENTO E LIMITAÇÃO DE ATUAÇÃO
A ORBITAL atua exclusivamente como fornecedora de revestimentos decorativos, não executando, não projetando, não acompanhando, não supervisionando, não fiscalizando e não se responsabilizando por obras, instalações, medições, preparo de base, compatibilizações técnicas, desempenho final ou resultado estético do ambiente.
Os produtos fornecidos não possuem caráter estrutural e não se equiparam a pedra natural, madeira maciça ou materiais construtivos tradicionais, sendo destinados exclusivamente a fins decorativos.

CLÁUSULA 2ª - DA INSTALAÇÃO, SERVIÇOS TERCEIRIZADOS E AUSÊNCIA DE RESPONSABILIDADE SOLIDÁRIA
A instalação dos produtos constitui serviço de terceiros, realizado por profissional independente, sem qualquer vínculo contratual, societário, trabalhista ou de representação com a ORBITAL.
A eventual indicação de instaladores, transportadores ou prestadores de serviço tem caráter estritamente facilitador, não implicando solidariedade, corresponsabilidade, garantia de resultado ou assunção de riscos pela ORBITAL.
O valor da mão de obra é orçado, contratado, cobrado e recebido diretamente pelo profissional escolhido, não integrando, sob nenhuma hipótese, o preço dos produtos fornecidos pela ORBITAL, sendo o COMPRADOR integralmente responsável pela escolha, contratação e fiscalização do prestador.

CLÁUSULA 3ª - DO PREPARO DA BASE, CONDIÇÕES DE APLICAÇÃO E RESPONSABILIDADE TÉCNICA
A avaliação da superfície, incluindo, mas não se limitando a, limpeza, regularização, nivelamento, impermeabilização, correção de prumo, tratamento contra umidade e demais preparos necessários à aplicação, são de responsabilidade exclusiva do COMPRADOR ou do profissional por ele contratado.
A ORBITAL não se responsabiliza por falhas, desprendimentos, deformações, fissuras, manchas, infiltrações, empenamentos, perdas estéticas ou danos de qualquer natureza decorrentes de:
* preparo inadequado da base;
* instalação incorreta;
* aplicação fora das recomendações técnicas;
* incompatibilidade do produto com o local escolhido.

CLÁUSULA 4ª - DAS CONDIÇÕES DE PAGAMENTO, LIBERAÇÃO E IRREVERSIBILIDADE DO PEDIDO
A liberação para entrega ou retirada dos produtos ocorrerá somente mediante: I - pagamento integral à vista; ou II - aprovação formal do parcelamento do valor total do pedido.
Após a aprovação do pedido de venda, não será admitido cancelamento, desistência, troca, devolução ou alteração da forma de entrega, nos termos aplicáveis a produtos comercializados sob encomenda.
Eventuais descontos concedidos para pagamento via PIX ou espécie aplicam-se exclusivamente aos produtos fornecidos pela ORBITAL, não abrangendo serviços terceirizados.

CLÁUSULA 5ª - DA ENTREGA, RETIRADA, CONFERÊNCIA E ENCERRAMENTO DA RESPONSABILIDADE
A responsabilidade da ORBITAL encerra-se no ato da entrega, mediante conferência da integridade dos produtos e sua aceitação pelo COMPRADOR.
No recebimento, compete exclusivamente ao COMPRADOR: I - conferir quantidade, tipo e especificação dos produtos; II - verificar defeitos aparentes, tais como riscos, trincas, quebras, empeno, oxidação, amassados ou divergências; III - registrar imediatamente qualquer inconformidade no documento da transportadora, com registros fotográficos.
A ausência de ressalvas caracteriza aceitação plena e definitiva dos produtos.
Na hipótese de retirada em depósito, a ORBITAL não se responsabiliza por danos ocorridos durante o transporte, assumindo o COMPRADOR integral responsabilidade após a retirada, observados os limites do Código de Defesa do Consumidor.
Caso a entrega não seja realizada por ausência do COMPRADOR, informações incorretas ou impedimentos alheios à ORBITAL, poderá ser cobrada nova taxa de entrega.

CLÁUSULA 6ª - DAS CARACTERÍSTICAS DOS PRODUTOS, VARIAÇÕES E TOLERÂNCIAS
Os produtos podem apresentar variações dimensionais milimétricas, bem como variações técnicas, visuais e de tonalidade entre lotes distintos, dentro das tolerâncias permitidas pelas normas da ABNT, não caracterizando defeito.
Produtos classificados como Classe Comercial (C) não serão considerados desconformes quando os aspectos estiverem dentro dos padrões dessa classificação.
Imagens, vídeos, renders, catálogos e materiais promocionais possuem caráter meramente ilustrativo, não constituindo garantia de identidade absoluta de textura, cor, brilho, escala ou acabamento.

CLÁUSULA 7ª - DA VEDAÇÃO À INSTALAÇÃO DE PRODUTOS COM DEFEITO E ACEITAÇÃO TÁCITA
Produtos com defeitos aparentes não devem ser instalados.
A instalação total ou parcial do produto implica aceitação definitiva, irretratável e integral, inclusive quanto a características visuais, dimensionais e de acabamento, afastando qualquer alegação posterior de vício aparente ou expectativa frustrada.

CLÁUSULA 8ª - DO USO, INSUMOS, GARANTIAS E EXCLUSÕES
A ORBITAL não garante desempenho, durabilidade ou aparência estética quando o produto for utilizado:
* fora das recomendações técnicas;
* em ambientes não indicados;
* sob condições extremas de calor, umidade excessiva ou exposição solar direta contínua;
* mediante instalação inadequada ou preparo incorreto da base;
* em caso de uso indevido, manutenção inadequada ou alterações posteriores.
O consumo de insumos, incluindo cola PU, é estimativo, podendo variar conforme superfície, técnica e execução, não gerando direito a complementação ou ressarcimento.

CLÁUSULA 9ª - DA LIMITAÇÃO DE RESPONSABILIDADE E EXPECTATIVA DO COMPRADOR
A ORBITAL não se responsabiliza por:
* atrasos de obra;
* custos adicionais;
* paralisações;
* danos indiretos;
* lucros cessantes;
* danos morais;
* insatisfação decorrente de gosto pessoal, expectativa subjetiva, alteração de projeto ou arrependimento posterior.
A ORBITAL não responde por atos, omissões, falhas técnicas ou danos causados por terceiros, incluindo instaladores, transportadoras, arquitetos, designers ou quaisquer profissionais contratados pelo COMPRADOR.
Somente informações prestadas por escrito em documentos oficiais da ORBITAL possuem validade jurídica, não vinculando a empresa a promessas verbais, interpretações subjetivas ou comunicações informais.

CLÁUSULA 10ª - DA GARANTIA LEGAL E DIREITOS DO COMPRADOR
A ORBITAL assegura ao COMPRADOR a garantia legal prevista no Código de Defesa do Consumidor, aplicável exclusivamente a vícios de fabricação que tornem o produto impróprio ou inadequado ao uso a que se destina, ou que lhe diminuam o valor.
Caso seja constatado defeito de fabricação, devidamente comunicado dentro do prazo legal e antes da instalação ou de qualquer intervenção no produto, a ORBITAL compromete-se a analisar o material e, sendo confirmada a responsabilidade, adotar as medidas cabíveis, tais como substituição do produto por outro em perfeitas condições, correção do defeito quando tecnicamente possível ou outra solução prevista em lei, sempre em conformidade com o Código de Defesa do Consumidor.
Para fins de garantia, o COMPRADOR deverá comunicar a ORBITAL por escrito, preferencialmente com registros fotográficos e descrição do ocorrido, tão logo identifique eventual vício, colaborando para uma análise técnica adequada.
Esta garantia tem por finalidade assegurar a qualidade do produto fornecido, não abrangendo falhas, danos ou prejuízos decorrentes de instalação, preparo inadequado da base, transporte após a entrega, uso fora das recomendações técnicas, intervenção de terceiros ou condições alheias ao processo de fabricação.
A instalação total ou parcial do produto caracteriza aceitação quanto a eventuais vícios aparentes, nos termos do Código de Defesa do Consumidor, permanecendo resguardado ao COMPRADOR o direito à garantia legal exclusivamente em relação a vícios de fabricação não aparentes no momento do recebimento.`;

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function docNumber(pedido: PedidoDocument) {
  const year = new Date(pedido.created_at).getFullYear().toString().slice(-2);
  return `${pedido.id.slice(0, 8).toUpperCase()}-${year}`;
}

function addressLines(pedido: PedidoDocument) {
  return [
    pedido.client_address,
    pedido.client_address_complement,
    [pedido.client_zip, pedido.client_city, pedido.client_state].filter(Boolean).join(" - "),
  ].filter(Boolean);
}

export default function PedidoDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType>("orcamento");
  const [pedido, setPedido] = useState<PedidoDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    const tipo = new URLSearchParams(window.location.search).get("tipo") || "orcamento";
    if (["orcamento", "pedido", "nota", "recibo"].includes(tipo)) setDocType(tipo as DocumentType);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/pedidos/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setPedido(data as PedidoDocument);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar documento."))
      .finally(() => setLoading(false));
  }, [id]);

  const totals = useMemo(() => {
    const items = pedido?.items ?? [];
    const itemSubtotal = items.reduce((s, it) => s + (Number(it.unit_price) || 0) * (Number(it.plates) || 0), 0);
    const discount = Number(pedido?.discount_amount) || 0;
    const freight = Number(pedido?.freight_amount) || 0;
    const fallbackSubtotal = Math.max(0, (Number(pedido?.total) || 0) + discount - freight);
    const subtotal = itemSubtotal > 0 ? itemSubtotal : fallbackSubtotal;
    const total = Number(pedido?.total) || Math.max(0, subtotal - discount + freight);
    return { subtotal, discount, freight, total };
  }, [pedido]);

  if (loading) {
    return <main className="min-h-screen pt-28 bg-[#f4f2ee] flex items-center justify-center text-[#74777f]">Carregando documento...</main>;
  }

  if (error || !pedido) {
    return (
      <main className="min-h-screen pt-28 bg-[#f4f2ee] flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 p-6 max-w-md text-center">
          <p className="text-red-700 font-semibold">Não foi possível carregar o documento.</p>
          <p className="text-[#74777f] text-sm mt-2">{error}</p>
        </div>
      </main>
    );
  }

  const items = pedido.items && pedido.items.length > 0
    ? pedido.items
    : [{
        id: "fallback",
        product_name: [pedido.space, pedido.product_name].filter(Boolean).join(" - ") || "Produto Orbital",
        plates: 1,
        unit_price: totals.subtotal,
        unit_cost: null,
      }];
  const customerAddress = addressLines(pedido);
  const notes = pedido.document_notes?.trim() || DEFAULT_NOTES;

  return (
    <main className="document-shell min-h-screen bg-[#f4f2ee] pt-28 pb-12 px-4">
      <div className="document-actions max-w-[980px] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#74777f]">Documento comercial</p>
          <h1 className="font-[var(--font-noto-serif)] text-2xl text-[#002045]">{DOC_LABEL[docType]} {docNumber(pedido)}</h1>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="border border-[#d8d5cf] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#002045]">Voltar</a>
          <button onClick={() => window.print()} className="bg-[#002045] text-white px-5 py-2 text-xs font-bold uppercase tracking-[0.1em]">Imprimir / PDF</button>
        </div>
      </div>

      <article className="document-page mx-auto bg-white text-[#1a1c1c] shadow-sm">
        <section className="doc-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/orbital-logo.png" alt="Orbital" className="doc-logo" />
          <div>
            <h2>{COMPANY.name}</h2>
            <p>{COMPANY.cnpj}</p>
            <p>{COMPANY.address}</p>
            <p>{COMPANY.city}</p>
          </div>
          <p className="doc-email">{COMPANY.email}</p>
        </section>

        <section className="doc-grid">
          <div>
            <p className="doc-section-label">Dados do Cliente</p>
            <p className="doc-strong">{pedido.client_name}</p>
            {pedido.client_email && <p>{pedido.client_email}</p>}
            {pedido.client_phone && <p>{pedido.client_phone}</p>}
            {customerAddress.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="doc-meta">
            <p><span>Data:</span> {fmtDate(pedido.created_at)}</p>
            {docType === "orcamento" && <p><span>Validade:</span> {fmtDate(pedido.quote_valid_until)}</p>}
            <p><span>Nº:</span> {docNumber(pedido)}</p>
          </div>
        </section>

        <div className="doc-title-bar">{DOC_LABEL[docType].toUpperCase()} Nº {docNumber(pedido)}</div>

        <section>
          <p className="doc-section-label">Produtos</p>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Quantidade</th>
                <th>Unidade</th>
                <th>Valor Unitário</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const unit = Number(it.unit_price) || 0;
                const qty = Number(it.plates) || 0;
                return (
                  <tr key={it.id}>
                    <td>{it.product_name || "Produto Orbital"}</td>
                    <td>{qty}</td>
                    <td>un</td>
                    <td>{fmtBRL(unit)}</td>
                    <td>{fmtBRL(unit * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="doc-totals">
          <div>
            <p><span>Subtotal</span><strong>{fmtBRL(totals.subtotal)}</strong></p>
            {totals.discount > 0 && <p><span>Desconto</span><strong>- {fmtBRL(totals.discount)}</strong></p>}
            {totals.freight > 0 && <p><span>Frete / despesas</span><strong>{fmtBRL(totals.freight)}</strong></p>}
            <p className="doc-total"><span>Total</span><strong>{fmtBRL(totals.total)}</strong></p>
          </div>
        </section>

        <section className="doc-commercial">
          <div>
            <p className="doc-section-label">Formas de pagamento</p>
            <p>{pedido.payment_methods?.length ? pedido.payment_methods.join(", ") : "Pix"}</p>
          </div>
          <div>
            <p className="doc-section-label">Condições de pagamento</p>
            <p>{pedido.payment_terms || "PIX ou dinheiro à vista"}</p>
          </div>
          <div>
            <p className="doc-section-label">Garantia</p>
            <p>{pedido.warranty_terms || "Garantia legal conforme Código de Defesa do Consumidor."}</p>
          </div>
        </section>

        {(pedido.notes || notes) && (
          <section className="doc-notes">
            <p className="doc-section-label">Condições</p>
            {pedido.notes && <p className="doc-order-notes">{pedido.notes}</p>}
            <p className="doc-contract">{notes}</p>
          </section>
        )}

        <section className="doc-signatures">
          <div><span />{COMPANY.name}</div>
          <div><span />{pedido.client_name}</div>
        </section>
        <p className="doc-fiscal">*** Não é válido como documento fiscal ***</p>
      </article>

      <style jsx global>{`
        .document-page {
          width: 210mm;
          min-height: 297mm;
          padding: 17mm;
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.25;
        }
        .doc-header {
          display: grid;
          grid-template-columns: 70px 1fr auto;
          gap: 12px;
          align-items: start;
          margin-bottom: 18px;
        }
        .doc-logo { width: 58px; height: auto; }
        .doc-header h2 { font-size: 15px; margin: 0 0 2px; font-weight: 700; }
        .doc-header p { margin: 0; }
        .doc-email { text-align: right; font-size: 10px; }
        .doc-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          border-top: 1px solid #d8d8d8;
          padding-top: 8px;
          margin-bottom: 10px;
        }
        .doc-section-label {
          color: #555;
          font-size: 14px;
          margin: 0 0 6px;
          border-bottom: 1px solid #d8d8d8;
          padding-bottom: 2px;
        }
        .doc-strong { font-weight: 700; }
        .doc-grid p { margin: 0 0 2px; }
        .doc-meta { text-align: right; min-width: 150px; align-self: end; }
        .doc-meta span { color: #555; }
        .doc-title-bar {
          background: #8d8d8d;
          color: #fff;
          text-align: center;
          padding: 5px;
          font-size: 14px;
          margin: 10px 0 14px;
        }
        .doc-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .doc-table th {
          background: #e1e1e1;
          font-weight: 400;
          text-align: left;
          padding: 4px;
        }
        .doc-table th:not(:first-child), .doc-table td:not(:first-child) { text-align: right; }
        .doc-table td { padding: 4px; border-bottom: 1px solid #eee; }
        .doc-totals { display: flex; justify-content: flex-end; margin: 18px 0 22px; }
        .doc-totals > div { width: 230px; }
        .doc-totals p { display: flex; justify-content: space-between; margin: 0 0 7px; gap: 20px; }
        .doc-total { font-size: 13px; font-weight: 700; border-top: 1px solid #d8d8d8; padding-top: 7px; }
        .doc-commercial {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        .doc-commercial p { margin: 0; }
        .doc-notes { margin-top: 8px; page-break-inside: auto; }
        .doc-order-notes { white-space: pre-wrap; margin: 0 0 12px; }
        .doc-contract { white-space: pre-wrap; margin: 0; font-size: 9.5px; color: #555; }
        .doc-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin: 45px 40px 18px;
          text-align: center;
          font-weight: 700;
        }
        .doc-signatures span { display: block; border-top: 1px solid #aaa; margin-bottom: 8px; }
        .doc-fiscal { text-align: center; color: #777; font-size: 9px; margin: 0; }

        @media screen and (max-width: 860px) {
          .document-page {
            width: min(100%, 210mm);
            min-height: auto;
            padding: 24px;
            overflow-x: auto;
          }
          .doc-commercial { grid-template-columns: 1fr; }
          .doc-header { grid-template-columns: 60px 1fr; }
          .doc-email { grid-column: 1 / -1; text-align: left; }
        }

        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          body > header, body > footer, .document-actions, .fixed, iframe { display: none !important; }
          .document-shell { padding: 0 !important; background: #fff !important; }
          .document-page {
            width: 210mm;
            min-height: 297mm;
            padding: 14mm 15mm;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}

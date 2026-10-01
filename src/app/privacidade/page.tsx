import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal, { EMPRESA, type SecaoLegal } from "@/components/PaginaLegal";

const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Política de Privacidade | Orbital Revestimentos",
  description:
    "Como a Orbital Revestimentos coleta, usa e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
  alternates: { canonical: `${BASE_URL}/privacidade` },
};

const secoes: SecaoLegal[] = [
  {
    titulo: "Quem é o responsável pelos seus dados",
    corpo: (
      <>
        <p>
          O controlador dos dados pessoais tratados neste site é a <strong>{EMPRESA.razao}</strong> (Orbital
          Revestimentos), CNPJ {EMPRESA.cnpj}, com sede na {EMPRESA.endereco}.
        </p>
        <p>
          Para qualquer assunto sobre privacidade, fale com a gente pelo e-mail{" "}
          <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a> ou pelo WhatsApp {EMPRESA.whatsapp}.
        </p>
      </>
    ),
  },
  {
    titulo: "Quais dados coletamos",
    corpo: (
      <>
        <p><strong>Dados que você nos informa</strong>, conforme o canal que usar:</p>
        <ul>
          <li><strong>Pedido de atendimento</strong> (“Falar com um consultor”): perfil (proprietário ou arquiteto), nome, WhatsApp, estágio da obra, medidas do ambiente, cidade e revestimentos de interesse.</li>
          <li><strong>Simulador</strong>: fotos do ambiente que você enviar, as imagens geradas a partir delas e, se pedir para receber o resultado, nome e WhatsApp.</li>
          <li><strong>Lista de espera da Academia Orbital</strong>: nome, WhatsApp, e-mail, cidade, área de atuação, tempo de experiência e como nos conheceu.</li>
          <li><strong>Programa de parceiros</strong>: nome, e-mail, WhatsApp, data de nascimento, código de indicação e senha de acesso ao portal.</li>
          <li><strong>Compras</strong>: nome, CPF ou CNPJ, e-mail, telefone, endereço de entrega e informações do pedido e do pagamento.</li>
          <li><strong>Conversas</strong> pelo WhatsApp, por e-mail ou pelo assistente virtual do site.</li>
        </ul>
        <p>
          <strong>Dados coletados automaticamente</strong> quando você navega: páginas visitadas, tempo de
          visita, tipo de dispositivo e navegador, localização aproximada e a origem do acesso (por exemplo,
          um anúncio ou uma busca), por meio de cookies e ferramentas de medição.
        </p>
      </>
    ),
  },
  {
    titulo: "Para que usamos seus dados",
    corpo: (
      <ul>
        <li>Responder seu pedido de atendimento e preparar orçamentos.</li>
        <li>Gerar e enviar as simulações do seu ambiente.</li>
        <li>Processar compras, emitir documentos, organizar entregas e prestar suporte pós-venda.</li>
        <li>Gerenciar o programa de parceiros e a lista de espera da Academia, incluindo avisos sobre o lançamento.</li>
        <li>Enviar novidades e conteúdos sobre nossos produtos, quando você tiver interesse; você pode pedir para não receber mais a qualquer momento.</li>
        <li>Medir o desempenho do site e das campanhas e melhorar a sua experiência.</li>
        <li>Cumprir obrigações legais e fiscais e proteger nossos direitos.</li>
      </ul>
    ),
  },
  {
    titulo: "Bases legais",
    corpo: (
      <p>
        Tratamos dados com base nas hipóteses do art. 7º da Lei nº 13.709/2018 (LGPD), principalmente: execução
        de contrato ou de procedimentos preliminares a pedido do titular (atendimento, orçamento e compra);
        cumprimento de obrigação legal ou regulatória (por exemplo, fiscal); legítimo interesse (melhoria do site,
        segurança e comunicação com quem já demonstrou interesse); exercício regular de direitos; e consentimento,
        quando ele for necessário.
      </p>
    ),
  },
  {
    titulo: "Cookies e ferramentas de medição",
    corpo: (
      <>
        <p>
          Usamos cookies e tecnologias semelhantes para o site funcionar e para entender como ele é usado.
          Entre as ferramentas utilizadas estão o Google Analytics, o Meta Pixel e as ferramentas de medição da
          Vercel, nossa provedora de hospedagem. O portal do parceiro guarda a sessão no seu navegador para que você
          não precise entrar novamente a cada visita.
        </p>
        <p>
          Você pode bloquear ou apagar cookies nas configurações do seu navegador. Alguns recursos podem deixar
          de funcionar corretamente.
        </p>
      </>
    ),
  },
  {
    titulo: "Com quem compartilhamos",
    corpo: (
      <>
        <p><strong>A Orbital não vende seus dados pessoais.</strong> Compartilhamos apenas o necessário com:</p>
        <ul>
          <li>Prestadores de tecnologia que operam o site em nosso nome: hospedagem e banco de dados, envio de e-mails, plataforma de atendimento via WhatsApp e serviços de inteligência artificial usados no simulador e no assistente virtual.</li>
          <li>Google e Meta, para medição de audiência e anúncios.</li>
          <li>Transportadoras, quando houver entrega.</li>
          <li>Contabilidade e autoridades públicas, quando exigido por lei ou ordem judicial.</li>
        </ul>
        <p>
          Alguns desses prestadores armazenam dados em servidores fora do Brasil. Nesses casos, a transferência
          segue as regras da LGPD.
        </p>
      </>
    ),
  },
  {
    titulo: "Armazenamento e segurança",
    corpo: (
      <p>
        Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados,
        perda ou alteração, como acesso restrito à equipe e conexões criptografadas. Nenhum sistema é totalmente
        imune a incidentes; se algum ocorrer e puder causar risco relevante, comunicaremos os titulares afetados e
        a Autoridade Nacional de Proteção de Dados (ANPD), conforme a lei.
      </p>
    ),
  },
  {
    titulo: "Por quanto tempo guardamos",
    corpo: (
      <p>
        Mantemos os dados pelo tempo necessário para as finalidades descritas acima. Dados de compras são
        guardados pelos prazos exigidos pela legislação fiscal e para o exercício de direitos. Depois disso, são
        excluídos ou anonimizados.
      </p>
    ),
  },
  {
    titulo: "Seus direitos",
    corpo: (
      <>
        <p>Nos termos do art. 18 da LGPD, você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e acessá-los;</li>
          <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>pedir anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
          <li>pedir a portabilidade dos dados;</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>revogar o consentimento, quando o tratamento depender dele.</li>
        </ul>
        <p>
          Para exercer seus direitos, escreva para <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>. Você
          também pode apresentar reclamação à ANPD.
        </p>
      </>
    ),
  },
  {
    titulo: "Alterações desta política",
    corpo: (
      <p>
        Esta política pode ser atualizada. A data da última atualização fica no topo da página. Consulte também
        os nossos <Link href="/termos">Termos de Uso</Link>.
      </p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de Privacidade"
      atualizado="1 de outubro de 2026"
      intro={
        <p>
          Esta política explica, de forma direta, quais dados pessoais a Orbital Revestimentos coleta por este site
          e pelos nossos canais de atendimento, para que eles são usados e como você pode exercer seus direitos,
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>
      }
      secoes={secoes}
    />
  );
}

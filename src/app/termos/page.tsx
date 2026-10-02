import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal, { EMPRESA, type SecaoLegal } from "@/components/PaginaLegal";

const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Termos de Uso | Orbital Revestimentos",
  description: "Regras de uso do site da Orbital Revestimentos, em Manaus, AM.",
  alternates: { canonical: `${BASE_URL}/termos` },
};

const secoes: SecaoLegal[] = [
  {
    titulo: "Sobre o site",
    corpo: (
      <p>
        Este site apresenta os produtos da Orbital Revestimentos, como o Painel Flexível Fibra de Bambu (PFB), além de
        projetos realizados, conteúdos técnicos, o simulador de ambientes e os canais de atendimento. Ao usar o
        site, você concorda com estes Termos de Uso.
      </p>
    ),
  },
  {
    titulo: "Uso do site",
    corpo: (
      <>
        <p>Ao usar o site, você se compromete a não:</p>
        <ul>
          <li>tentar acessar áreas restritas, sistemas ou dados sem autorização;</li>
          <li>interferir no funcionamento do site ou sobrecarregá-lo de forma intencional;</li>
          <li>enviar informações falsas ou de terceiros sem autorização;</li>
          <li>copiar ou reutilizar conteúdos do site para fins comerciais sem nossa autorização.</li>
        </ul>
      </>
    ),
  },
  {
    titulo: "Produtos, preços e informações",
    corpo: (
      <>
        <p>
          Preços, disponibilidade e especificações podem mudar sem aviso prévio. Confirme sempre com um consultor
          antes de fechar a compra.
        </p>
        <p>
          Fotos, vídeos e imagens têm caráter ilustrativo. Cor, brilho e textura podem variar conforme a tela, a
          iluminação e o lote de fabricação.
        </p>
      </>
    ),
  },
  {
    titulo: "Simulador de ambientes",
    corpo: (
      <p>
        As imagens do simulador são geradas por inteligência artificial e servem como referência visual. Elas não
        substituem um projeto e podem não reproduzir com exatidão medidas, proporções, cores e acabamentos. Envie
        apenas fotos que você tem direito de usar.
      </p>
    ),
  },
  {
    titulo: "Compras e instalação",
    corpo: (
      <>
        <p>
          As condições de cada compra, como valores, pagamento, prazo, entrega e garantia, constam no orçamento e
          no pedido de venda, que prevalecem sobre as informações gerais do site. Os produtos contam com a
          garantia legal prevista no Código de Defesa do Consumidor.
        </p>
        <p>
          A Orbital disponibiliza o Manual Técnico de Instalação, com o passo a passo detalhado, na página{" "}
          <Link href="/tecnologia">Tecnologia</Link>, e o envia ao cliente sempre que solicitado. A instalação é
          feita pelo profissional de livre escolha do cliente.
        </p>
      </>
    ),
  },
  {
    titulo: "Parceiros e Academia Orbital",
    corpo: (
      <p>
        O programa de parceiros segue as regras informadas no cadastro e no portal do parceiro. A inscrição na
        lista de espera da Academia Orbital serve para receber o aviso de abertura e não garante vaga.
      </p>
    ),
  },
  {
    titulo: "Propriedade intelectual",
    corpo: (
      <p>
        A marca Orbital, o logotipo, os textos, as fotos de projetos e o layout do site pertencem à Orbital
        Revestimentos ou são usados com autorização. Não é permitido usá-los sem autorização prévia por escrito.
      </p>
    ),
  },
  {
    titulo: "Links para outros sites",
    corpo: (
      <p>
        O site tem links para serviços de terceiros, como WhatsApp e Instagram. Esses serviços têm termos e
        políticas próprios, pelos quais a Orbital não responde.
      </p>
    ),
  },
  {
    titulo: "Disponibilidade do site",
    corpo: (
      <p>
        Trabalhamos para manter o site no ar e com informações corretas, mas ele pode passar por interrupções,
        manutenções ou conter erros pontuais, que corrigiremos assim que identificados.
      </p>
    ),
  },
  {
    titulo: "Privacidade",
    corpo: (
      <p>
        O tratamento de dados pessoais está descrito na nossa <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    ),
  },
  {
    titulo: "Alterações e legislação",
    corpo: (
      <p>
        Estes termos podem ser atualizados, e a data da última versão fica no topo da página. Aplica-se a
        legislação brasileira. Fica eleito o foro da comarca de Manaus/AM, ressalvados os direitos do consumidor de
        escolher o foro do seu domicílio.
      </p>
    ),
  },
  {
    titulo: "Contato",
    corpo: (
      <p>
        {EMPRESA.razao}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}. E-mail:{" "}
        <a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a>. WhatsApp: {EMPRESA.whatsapp}.
      </p>
    ),
  },
];

export default function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de Uso"
      atualizado="1 de outubro de 2026"
      intro={<p>Estas são as regras para usar o site da Orbital Revestimentos. Leia com atenção.</p>}
      secoes={secoes}
    />
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PaginaLegal, { EMPRESA, type SecaoLegal } from "@/components/PaginaLegal";

const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  title: "Termos de Uso | Orbital Revestimentos",
  description:
    "Regras de uso do site e condições de fornecimento dos produtos da Orbital Revestimentos, em Manaus, AM, inclusive quando comprados de revendedores.",
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
  // Condições de fornecimento: as cláusulas do Pedido de Venda
  // (src/lib/clausulas-pedido.ts) que valem para o PRODUTO, qualquer que seja
  // quem vendeu. O PFB também é vendido por terceiros (revendedores,
  // marceneiros, lojas), cujo cliente nunca assina o pedido da Orbital — por
  // isso a Orbital, como fornecedora do material, publica aqui. Ficam de fora
  // as cláusulas da venda em si (pagamento, cancelamento, entrega), que são de
  // quem vende. Mudou uma cláusula de produto no pedido, muda aqui também.
  {
    titulo: "Compras diretas e por revendedores",
    corpo: (
      <>
        <p>
          O Painel Flexível Fibra de Bambu (PFB) pode ser comprado diretamente da Orbital ou de terceiros que
          revendem o material, como lojas, revendedores, marceneiros e outros profissionais.
        </p>
        <p>
          Nas compras feitas diretamente com a Orbital, as condições de cada venda, como valores, pagamento,
          prazo e entrega, constam no pedido de venda, que prevalece sobre as informações gerais do site.
        </p>
        <p>
          Nas compras feitas com terceiros, as condições comerciais (preço, pagamento, prazo, entrega, troca e
          serviços incluídos) são definidas por quem vendeu e são de responsabilidade dele. Os terceiros que
          revendem o PFB atuam por conta própria e não estão autorizados a assumir compromissos em nome da
          Orbital além do que está escrito nos documentos oficiais da Orbital.
        </p>
        <p>
          As condições de fornecimento a seguir valem para o produto em qualquer canal de compra, direto ou por
          terceiros.
        </p>
      </>
    ),
  },
  {
    titulo: "Fornecimento do produto",
    corpo: (
      <>
        <p>
          A Orbital fornece revestimentos decorativos para paredes e forros, sem função estrutural. Não fazem
          parte do fornecimento a instalação, o projeto, a medição, o preparo da superfície, as compatibilizações
          técnicas e o acompanhamento da obra, que são de responsabilidade do cliente e dos profissionais por ele
          contratados.
        </p>
      </>
    ),
  },
  {
    titulo: "Instalação",
    corpo: (
      <>
        <p>
          A Orbital disponibiliza o Manual Técnico de Instalação, com o passo a passo detalhado, solicitado pela
          página <Link href="/tecnologia">Tecnologia</Link> e enviado pelo WhatsApp. Cabe ao cliente e ao
          profissional por ele contratado consultar e seguir o Manual.
        </p>
        <p>
          A instalação é serviço de terceiro, executado por profissional de livre escolha do cliente, por ele
          contratado, fiscalizado e pago diretamente, sem vínculo contratual, societário, trabalhista ou de
          representação com a Orbital. A Orbital não exige nem indica profissional específico. O repasse de
          contatos de instaladores, transportadores ou outros prestadores, quando solicitado, tem caráter
          meramente facilitador e não torna a Orbital responsável pela qualidade, prazo, preço ou execução do
          serviço.
        </p>
        <p>
          O preparo da superfície (limpeza, regularização, nivelamento, prumo, impermeabilização e tratamento de
          umidade) é responsabilidade do cliente ou do profissional por ele contratado. A Orbital não responde por
          descolamentos, deformações, fissuras, manchas, infiltrações ou empenamentos decorrentes de preparo
          inadequado da base, instalação incorreta ou aplicação fora das recomendações do Manual Técnico.
        </p>
      </>
    ),
  },
  {
    titulo: "Características do produto",
    corpo: (
      <>
        <p>
          Por serem fabricados em lotes, os produtos podem apresentar variações de tonalidade, textura e pequenas
          variações dimensionais entre lotes, dentro das tolerâncias de fabricação, o que não caracteriza defeito.
          Para um mesmo ambiente, recomenda-se utilizar placas do mesmo lote.
        </p>
        <p>
          Imagens, vídeos, renders, simulações e catálogos têm caráter ilustrativo e não garantem identidade
          absoluta de textura, cor, brilho, escala ou acabamento.
        </p>
      </>
    ),
  },
  {
    titulo: "Indicações de uso",
    corpo: (
      <>
        <p>Os produtos não são indicados para:</p>
        <ul>
          <li>tampos de bancada, pisos e fachadas;</li>
          <li>áreas externas e semiexternas, bordas de piscina e áreas molhadas externas;</li>
          <li>saunas e salas de vapor;</li>
          <li>churrasqueiras, lareiras e coifas;</li>
          <li>superfícies sujeitas a impacto ou atrito constante;</li>
          <li>locais com calor contínuo acima de 50 °C ou exposição solar direta contínua.</li>
        </ul>
        <p>
          A Orbital não garante desempenho, durabilidade ou aparência quando o produto for utilizado nesses
          locais, fora das recomendações técnicas ou do Manual Técnico de Instalação, sobre base mal preparada, ou
          em caso de uso indevido, manutenção inadequada ou alterações posteriores.
        </p>
        <p>
          O consumo de cola PU e demais insumos é estimado e pode variar conforme a superfície, a técnica e a
          execução.
        </p>
      </>
    ),
  },
  {
    titulo: "Garantia",
    corpo: (
      <>
        <p>
          Os produtos contam com a garantia legal prevista no Código de Defesa do Consumidor contra vícios de
          fabricação, inclusive quando comprados de terceiros.
        </p>
        <p>
          No recebimento, confira quantidade, modelo e especificação e verifique defeitos aparentes, como riscos,
          trincas, quebras, empenos, manchas ou divergências. Produtos com defeito aparente não devem ser
          instalados. Defeitos aparentes devem ser comunicados por escrito antes da instalação ou de qualquer
          intervenção no produto; defeitos não aparentes, assim que identificados, dentro do prazo legal.
        </p>
        <p>
          A comunicação pode ser feita a quem vendeu ou diretamente à Orbital, com fotos, descrição do ocorrido e
          o comprovante de compra, e o cliente deve permitir a análise técnica do material. Confirmado o vício de
          fabricação, o produto é substituído por outro em perfeitas condições ou é adotada outra solução prevista
          em lei.
        </p>
        <p>
          A instalação, total ou parcial, caracteriza aceitação definitiva do produto quanto a defeitos aparentes
          e a características visuais, dimensionais e de acabamento, permanecendo a garantia legal para vícios de
          fabricação não aparentes no recebimento.
        </p>
        <p>
          A garantia não cobre falhas ou danos decorrentes de instalação, preparo da base, transporte após a
          entrega, uso fora das indicações de uso, intervenção de terceiros ou causas alheias à fabricação.
        </p>
      </>
    ),
  },
  {
    titulo: "Expectativas e limitação de responsabilidade",
    corpo: (
      <>
        <p>
          A escolha do produto, da cor, do acabamento, da paginação e do local de aplicação é do cliente, com base
          nas informações técnicas e visuais disponibilizadas.
        </p>
        <p>
          A Orbital não confere garantia de resultado estético, decorativo ou de satisfação pessoal. Insatisfação
          decorrente de gosto pessoal, expectativa subjetiva, alteração de projeto ou arrependimento posterior não
          caracteriza vício do produto.
        </p>
        <p>
          A Orbital não responde por atos, omissões, promessas ou falhas de terceiros, como revendedores,
          instaladores, transportadoras, arquitetos e designers, nem por condições comerciais oferecidas por
          eles.
        </p>
        <p>
          Nos limites permitidos pela lei, a responsabilidade da Orbital limita-se ao valor dos produtos
          fornecidos e não abrange danos indiretos, lucros cessantes, atrasos, paralisações ou custos adicionais
          de obra. Somente as informações registradas por escrito nos documentos oficiais da Orbital têm validade,
          não a vinculando a promessas verbais, interpretações subjetivas ou comunicações informais.
        </p>
      </>
    ),
  },
  {
    titulo: "Parceiros e Academia Orbital",
    corpo: (
      <p>
        O programa de parceiros segue as regras informadas no cadastro e no portal do parceiro. A pré-inscrição
        na formação da Academia Orbital não garante vaga: a participação depende da confirmação de presença,
        pedida aos inscritos antes da data. Quem não confirmar ou desistir pode ter a vaga repassada a outro
        inscrito, pela ordem da lista de espera. A gratuidade vale somente para a 1ª turma.
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
      atualizado="12 de outubro de 2026"
      intro={
        <p>
          Estas são as regras para usar o site da Orbital Revestimentos e as condições de fornecimento dos nossos
          produtos, inclusive quando comprados de revendedores e outros parceiros. Leia com atenção.
        </p>
      }
      secoes={secoes}
    />
  );
}

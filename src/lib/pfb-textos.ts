/**
 * Todo o texto da página do Painel Flexível em Fibra de Bambu (PFB) em
 * /produtos/pfb, por seção. Spec: .superpowers/sdd/2026-11-06-pagina-pfb/
 * design_doc.md, item 16 e tabelas de "A página, seção por seção" (Seções 1 a
 * 6). Os textos são copiados letra por letra; qualquer ajuste volta à spec.
 *
 * Sem `import` de componente. As frases de cada linha (Classic, Brilliance,
 * Elegance) vêm de `LINHAS_PFB` (pfb-linhas.ts) e não se repetem aqui.
 *
 * Notas de fonte (vault `~/Orbital/Orbital Vault/`): [PFB] 03 Produto/PFB,
 * [Nome] 02 Marca/Regras de posicionamento do PFB §1, [Ficha] 03 Produto/
 * Ficha técnica, [Onde] 03 Produto/Onde usar e onde não usar, [Garantia]
 * 03 Produto/Garantia, [Instalação] 03 Produto/Instalação, [Materiais]
 * 03 Produto/Materiais de instalação, [Manual] 03 Produto/Manual Técnico de
 * Instalação, [Catálogo] 03 Produto/Catálogo de modelos, [Classic],
 * [Brilliance], [Elegance] 03 Produto/Linha <nome>, [Showroom]
 * 01 Empresa/Showroom, [Palavras] 02 Marca/Palavras certas e palavras
 * proibidas, [Dono Qn] decisão do dono no brief (pergunta n), [Dono En]
 * decisão do dono de 06/11/2026.
 */

/** Seção 1: abertura. */
export const ABERTURA = {
  // fonte: [PFB], [Nome]
  titulo: "Painel Flexível em Fibra de Bambu (PFB)",
  // fonte: [PFB]
  lead: "Revestimento decorativo para paredes e tetos, com acabamento de mármore ou de madeira e aplicação sem quebradeira.",
  // fonte: [PFB]
  estoque: "Estoque e pronta-entrega em Manaus.",
  botaoModelos: "Ver os modelos",
  botaoConsultor: "Falar com um consultor",
  // fonte: PorQue.tsx:34; obra real: decisão do dono E-2 (06/11/2026), Open Questions item 8
  legenda: "Foto de obra: escada com o PFB em acabamento de madeira.",
  // fonte: idem (PorQue.tsx:34; decisão do dono E-2, 06/11/2026)
  alt: "Escada residencial com paredes revestidas com o Painel Flexível em Fibra de Bambu em acabamento de madeira",
} as const;

/** Seção 2: as camadas (só o nome de cada uma, decisão do dono E-4). */
export const CAMADAS: {
  titulo: string;
  lead: string;
  /** De cima para baixo; `nomes[0]` é a película protetora. */
  nomes: readonly [string, string, string, string, string];
  legenda: string;
} = {
  titulo: "A placa por dentro",
  // fonte: [Dono Q1], [Ficha]
  lead: "Cinco camadas formam a placa de 5 mm.",
  nomes: [
    // fonte: [Dono Q1]
    "Película protetora",
    // fonte: [Dono Q1]
    "Película de PVC com a impressão",
    // fonte: [Dono Q1]
    "Adesivo de alta aderência",
    // fonte: [Dono Q1]
    "Camada de PVC",
    // fonte: [Dono Q1]
    "Substrato de fibra de bambu",
  ],
  // fonte: [Ficha]
  legenda: "As cinco juntas têm 5 mm.",
};

/** Seção 3: ficha técnica. */
export const FICHA: {
  titulo: string;
  lead: string;
  selos: ReadonlyArray<{ texto: string; ressalva?: string }>;
  numeros: ReadonlyArray<{ valor: string; frase: string }>;
  figura: {
    legenda: string;
    ariaLabel: string;
    largura: "1,20 m";
    altura: "2,90 m";
  };
  art: { titulo: string; texto: string };
  durabilidade: { titulo: string; texto: string };
  garantia: { titulo: string; texto: string };
} = {
  titulo: "Ficha técnica",
  // fonte: [Classic], [Brilliance], [Elegance] ("Todas as linhas têm a mesma placa e a mesma Ficha técnica")
  lead: "A mesma placa e a mesma ficha nas três linhas.",
  selos: [
    {
      // fonte: [Ficha], [Dono] (0,2% é absorção de água)
      texto: "Absorção de água de 0,2% em 48 h",
      // fonte: [Onde]
      ressalva:
        "O Painel é acabamento e não substitui a impermeabilização: em banheiro e box, a base precisa estar impermeabilizada.",
    },
    // fonte: [Ficha]
    { texto: "Resistente a mofo e cupim" },
    // fonte: [Ficha]
    { texto: "Sem formaldeído" },
    // fonte: [Ficha], [Dono Q3] (sem norma nem classe)
    { texto: "Não propaga chamas" },
  ],
  numeros: [
    {
      // fonte: [Ficha], [PFB] (a medida informada é 1,20 m)
      valor: "1,20 × 2,90 m",
      frase:
        "Medida útil da placa, com 5 mm de espessura e 3,48 m² de área.",
    },
    // fonte: [Ficha]
    { valor: "cerca de 11 kg", frase: "Peso de uma placa, ou 3,2 kg/m²." },
    // fonte: [Ficha]
    { valor: "72,3 MPa", frase: "Resistência à flexão da placa." },
    // fonte: [Ficha]
    { valor: "550 kg/m³", frase: "Densidade da placa." },
    // fonte: [Ficha]
    { valor: "0,5%", frase: "Teor de umidade da placa." },
  ],
  figura: {
    // fonte: [Ficha] (medida da placa)
    legenda: "A placa em escala, ao lado de uma porta de 0,80 × 2,10 m.",
    ariaLabel:
      "Desenho em escala: a placa de 1,20 × 2,90 m ao lado de uma porta de 0,80 × 2,10 m",
    // fonte: [Ficha] (rótulos da figura)
    largura: "1,20 m",
    // fonte: [Ficha] (rótulos da figura)
    altura: "2,90 m",
  },
  art: {
    titulo: "ART",
    // fonte: [Ficha], [PFB] (número e engenheiro: Pendente do dono, item 5)
    texto:
      "Anotação de Responsabilidade Técnica registrada no CREA para parede e forro de teto.",
  },
  durabilidade: {
    titulo: "Durabilidade",
    // fonte: [Ficha]
    texto: "Esperada de 10 anos ou mais.",
  },
  garantia: {
    titulo: "Garantia",
    // fonte: [Garantia]
    texto:
      "Garantia legal do Código de Defesa do Consumidor contra vício de fabricação. Confira as placas na entrega: placa com defeito aparente não deve ser instalada; avise a Orbital por escrito, com fotos, antes de aplicar.",
  },
};

/** Seção 4: as três linhas (as frases de cada linha estão em `LINHAS_PFB`). */
export const LINHAS = {
  // fonte: [PFB]
  titulo: "Três linhas",
  // fonte: [Classic], [Brilliance], [Elegance]
  lead: "Mármore fosco, mármore polido ou madeira texturizada.",
  /** Texto do bloco-link de cada linha: `verModelos("Classic")`. */
  verModelos: (linha: string): string => `Ver os modelos ${linha}`,
  // fonte: [Ficha] (Lotes, Imagens)
  aviso:
    "Pode haver pequena variação de tom entre lotes: use placas do mesmo lote em cada ambiente. As imagens são ilustrativas, e cor, brilho e escala reais podem variar.",
} as const;

/** Seção 5: serve para o meu projeto? */
export const SERVE: {
  titulo: string;
  ondeUsar: { titulo: string; paragrafos: readonly string[] };
  ondeNaoUsar: { titulo: string; paragrafos: readonly string[] };
  comoAplicar: {
    titulo: string;
    /** Os três `p` antes do `p` com o link do manual. */
    paragrafos: readonly string[];
    /** Texto antes do link "Manual Técnico de Instalação" (`SolicitarManual`). */
    antesDoManual: string;
    depoisDoManual: ".";
  };
  video: { titulo: "Opinião de um instalador" };
} = {
  titulo: "Serve para o meu projeto?",
  ondeUsar: {
    titulo: "Onde usar",
    paragrafos: [
      // fonte: [Onde]
      "Em ambientes internos, secos ou úmidos: salas, quartos, escritórios, corredores, comércio, clínicas, forros e tetos, portas, curvas e colunas. Na cozinha, nas paredes, inclusive no roda-banca e no roda-pia.",
      // fonte: [Onde]
      "Em banheiro e dentro do box também, desde que a base esteja impermeabilizada e a vedação seja contínua nas juntas, cantos, bordas e recortes. O Painel é acabamento e não substitui a impermeabilização.",
    ],
  },
  ondeNaoUsar: {
    titulo: "Onde não usar",
    paragrafos: [
      // fonte: [Onde]
      "Piso, tampo de bancada, fachada, áreas externas e semiexternas, borda de piscina e áreas molhadas externas, sauna e sala de vapor, churrasqueira, lareira e coifa, superfícies com impacto ou atrito constante, e lugares com calor contínuo acima de 50 °C ou sol direto contínuo.",
    ],
  },
  comoAplicar: {
    titulo: "Como aplicar",
    paragrafos: [
      // fonte: [Instalação]
      "Na parede: base firme, seca, limpa e plana, teste a seco e cola PU de alta aderência.",
      // fonte: [Instalação], [PFB] (decisão do dono E-5, 06/11/2026)
      "Na parede, a aplicação leva de 2 a 3 horas por cômodo, sem quebradeira.",
      // fonte: [Instalação], [Materiais]
      "No teto e no forro: sempre com fixação mecânica, usando cola de contato e espuma expansiva.",
    ],
    // fonte: [Instalação], [Manual]
    antesDoManual:
      "A Orbital fornece o material, e a aplicação fica com o profissional que você escolher e contratar. O passo a passo está no ",
    depoisDoManual: ".",
  },
  // fonte: Pendente do dono, item 6
  video: { titulo: "Opinião de um instalador" },
};

/** Seção 6: onde ver e como pedir. */
export const PEDIR: {
  titulo: string;
  frase: string;
  reserva: {
    frase: "Veja onde o PFB já foi aplicado.";
    link: "Ver projetos e showrooms";
  };
  orcamento: {
    titulo: "Para pedir um orçamento";
    paragrafos: readonly [string, string];
  };
  botaoConsultor: string;
  botaoModelos: string;
} = {
  titulo: "Onde ver e como pedir",
  // fonte: [Showroom]
  frase:
    "Veja o PFB aplicado nos showrooms parceiros, ou as placas em grande formato na Casa do Eletricista.",
  reserva: {
    frase: "Veja onde o PFB já foi aplicado.",
    link: "Ver projetos e showrooms",
  },
  orcamento: {
    titulo: "Para pedir um orçamento",
    paragrafos: [
      // fonte: [Brief §6], [Palavras] ("valores com o consultor")
      "Mande a área em m² ou a planta, a linha e o modelo. Um consultor responde com os valores e as condições.",
      // fonte: [Showroom] ("Nós vamos até o escritório do arquiteto"), decisão do dono E-6 (06/11/2026, amostras confirmadas)
      "Se preferir, um consultor vai até o seu escritório com as amostras.",
    ],
  },
  botaoConsultor: "Falar com um consultor",
  botaoModelos: "Ver os modelos",
};

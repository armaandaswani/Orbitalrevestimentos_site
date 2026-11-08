/**
 * Todo o texto da página do Painel Flexível em Fibra de Bambu (PFB) em
 * /produtos/pfb, por capítulo. Spec: docs/superpowers/specs/
 * 2026-11-07-pfb-experiencia-design.md, "Textos finais" (v2). Os textos são
 * copiados letra por letra; qualquer ajuste volta à spec (pfb-textos.test.mjs
 * confere cada literal do bloco contra este arquivo).
 *
 * Sem `import`. Os valores marcados "como hoje" na spec vêm da versão anterior
 * deste arquivo (spec .superpowers/sdd/2026-11-06-pagina-pfb/design_doc.md).
 *
 * Notas de fonte (vault `~/Orbital/Orbital Vault/`): [PFB] 03 Produto/PFB,
 * [Nome] 02 Marca/Regras de posicionamento do PFB §1, [Ficha] 03 Produto/
 * Ficha técnica, [Onde] 03 Produto/Onde usar e onde não usar, [Garantia]
 * 03 Produto/Garantia, [Instalação] 03 Produto/Instalação, [Materiais]
 * 03 Produto/Materiais de instalação, [Manual] 03 Produto/Manual Técnico de
 * Instalação, [Catálogo] 03 Produto/Catálogo de modelos, [Classic],
 * [Brilliance], [Elegance] 03 Produto/Linha <nome>, [Showroom]
 * 01 Empresa/Showroom, [Palavras] 02 Marca/Palavras certas e palavras
 * proibidas, [Brief §n] brief da página, seção n, [Dono Qn] decisão do dono
 * no brief (pergunta n), [Dono En] decisão do dono de 06/11/2026, Dn decisão
 * do dono de 07/11/2026 (tabela "Decisões do dono" da spec).
 */

/** Capítulo 1: abertura. */
export const ABERTURA = {
  // fonte: [PFB], [Nome]
  titulo: "Painel Flexível em Fibra de Bambu (PFB)",
  // fonte: [PFB]
  lead: "Revestimento decorativo para paredes e tetos, com acabamento de mármore ou de madeira e aplicação sem quebradeira.",
  // fonte: [PFB]
  estoque: "Estoque e pronta-entrega em Manaus.",
  botaoModelos: "Ver os modelos",
  botaoConsultor: "Falar com um consultor",
  // fonte: PorQue.tsx:34; obra real: decisão do dono E-2 (06/11/2026); sem "residencial" (revisor-tecnico 07/11/2026)
  alt: "Escada com paredes revestidas com o Painel Flexível em Fibra de Bambu em acabamento de madeira",
} as const;

/** Capítulo 2: o que é. */
export const O_QUE_E = {
  // fonte: [Nome] (renovável, leve), vault 02 Marca/Regras de posicionamento do PFB ("ideal para Manaus"), 01 Empresa/Quem somos (clima amazônico), orbital-marca (pensado para o clima de Manaus), [Ficha] (flexível)
  frase: "Fibra de bambu renovável, leve e flexível, pensada para o clima de Manaus.",
  // fonte: [Ficha]
  medidas: "1,20 × 2,90 m · 5 mm · 3,48 m² por placa",
} as const;

/** Capítulo 2: os seis selos; ícone em public/images/selos/pfb-icone-<icone>.svg. */
export const SELOS: ReadonlyArray<{
  icone: "agua" | "pragas" | "chamas" | "pu" | "eco" | "flex";
  nome: string;
}> = [
  // fonte: [Ficha] 0,2% em 48 h
  { icone: "agua", nome: "Baixa absorção de água" },
  // fonte: [Ficha]
  { icone: "pragas", nome: "Resistente a mofo e cupim" },
  // fonte: [Ficha], [Dono Q3]
  { icone: "chamas", nome: "Não propaga chamas" },
  // fonte: [Instalação] 2 a 3 h por cômodo na parede
  { icone: "pu", nome: "Aplicação rápida" },
  // fonte: [Nome]
  { icone: "eco", nome: "Fibra de bambu renovável" },
  // fonte: [Ficha], [Nome]
  { icone: "flex", nome: "Flexível e leve" },
];

/** Capítulo 3: a placa por dentro (só o nome de cada camada, decisão do dono E-4). */
export const CAMADAS: {
  titulo: string;
  lead: string;
  /** De cima para baixo; `nomes[0]` é a película protetora. */
  nomes: readonly [string, string, string, string, string];
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
};

/** Capítulo 4: ficha técnica. O primeiro número é o destaque. */
export const FICHA: {
  titulo: string;
  numeros: ReadonlyArray<{ valor: string; frase: string }>;
  ressalva: string;
} = {
  titulo: "Ficha técnica",
  numeros: [
    // fonte: [Ficha]
    { valor: "72,3 MPa", frase: "Resistência à flexão." },
    // fonte: [Ficha], [Dono] (0,2% é absorção de água)
    { valor: "0,2%", frase: "Absorção de água em 48 h." },
    // fonte: [Ficha]
    { valor: "3,2 kg/m²", frase: "Cerca de 11 kg por placa." },
    // fonte: [Ficha], D5 (os 550 são do substrato, sem películas e PVC)
    { valor: "550 kg/m³", frase: "Densidade do substrato de fibra de bambu." },
    // fonte: [Ficha]
    { valor: "0,5%", frase: "Teor de umidade." },
  ],
  // fonte: [Onde]
  ressalva:
    "O Painel é acabamento e não substitui a impermeabilização: em banheiro e box, a base precisa estar impermeabilizada.",
};

/** Capítulo 4: o bloco que abre ao tocar (pares rótulo / valor). */
export const FICHA_COMPLETA: {
  resumo: string;
  linhas: ReadonlyArray<readonly [string, string]>;
} = {
  resumo: "Ficha técnica completa",
  linhas: [
    // fonte: [Ficha]
    ["Medida útil", "1,20 × 2,90 m"],
    // fonte: [Ficha]
    ["Espessura", "5 mm, em cinco camadas"],
    // fonte: [Ficha]
    ["Área por placa", "3,48 m²"],
    // fonte: [Ficha]
    ["Mofo e cupim", "Resistente"],
    // fonte: [Ficha]
    ["Formaldeído", "Não contém"],
    // fonte: [Ficha], [Dono Q3] (sem norma nem classe)
    ["Fogo", "Não propaga chamas"],
    // fonte: [Ficha], [PFB] (o vault tem o número e o engenheiro; o site não os mostra, decisão aberta do dono)
    ["ART", "Anotação de Responsabilidade Técnica registrada no CREA para parede e forro de teto."],
    // fonte: [Ficha]
    ["Durabilidade", "Esperada de 10 anos ou mais."],
    // fonte: [Garantia]
    [
      "Garantia",
      "Garantia legal do Código de Defesa do Consumidor contra vício de fabricação. Confira as placas na entrega: placa com defeito aparente não deve ser instalada; avise a Orbital por escrito, com fotos, antes de aplicar.",
    ],
  ],
};

/** Capítulo 5: teste de água. */
export const AGUA: {
  titulo: string;
  frase: string;
  horas: ReadonlyArray<{ rotulo: "0h" | "24h" | "48h"; legenda: string; alt: string }>;
  aviso: string;
} = {
  titulo: "Teste de água",
  // fonte: [Ficha] (0,2% em 48 h, absorção)
  frase: "A placa passou 48 horas na água. No ensaio, a absorção foi de 0,2%.",
  horas: [
    // fonte: D2 (fotos do teste; a comparação com o MDF foi liberada só aqui)
    {
      rotulo: "0h",
      legenda: "Início.",
      alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, no começo do teste de água, imagem gerada por IA",
    },
    // fonte: D2
    {
      rotulo: "24h",
      legenda: "24 horas na água.",
      alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 24 horas na água, imagem gerada por IA",
    },
    // fonte: D2
    {
      rotulo: "48h",
      legenda: "48 horas na água.",
      alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 48 horas na água, imagem gerada por IA",
    },
  ],
  // fonte: [Ficha] (imagens ilustrativas); D2
  aviso: "Imagens ilustrativas.",
};

/** Capítulo 6: Manaus. */
export const MANAUS: {
  titulo: string;
  pontos: readonly [string, string];
} = {
  // fonte: vault 02 Marca/Regras de posicionamento do PFB ("ideal para Manaus"), 01 Empresa/Quem somos (clima amazônico), orbital-marca ("pensado para o clima de Manaus")
  titulo: "Pensado para o clima de Manaus.",
  pontos: [
    // fonte: [Onde]
    "Para paredes e tetos de ambientes internos, secos ou úmidos.",
    // fonte: [Ficha]
    "Durabilidade esperada de 10 anos ou mais.",
  ],
};

/** Capítulo 7: as três linhas e o leque. */
export const LINHAS: {
  titulo: string;
  curtas: ReadonlyArray<{ linha: "Classic" | "Brilliance" | "Elegance"; frase: string }>;
  botaoModelos: string;
} = {
  // fonte: [PFB]
  titulo: "Três linhas",
  curtas: [
    // fonte: [Classic]
    { linha: "Classic", frase: "Mármore fosco, sem reflexo." },
    // fonte: [Brilliance]
    { linha: "Brilliance", frase: "Mármore polido, de alto brilho." },
    // fonte: [Elegance]
    { linha: "Elegance", frase: "Madeira texturizada e fosca." },
  ],
  botaoModelos: "Ver os modelos",
};

/** Capítulo 8: o vídeo do instalador. */
export const INSTALADOR = {
  // fonte: Pendente do dono, item 6 (título atual no ar)
  titulo: "Opinião de um instalador",
  // fonte: Pendente do dono, item 6
  frase: "Como é aplicar o Painel na prática.",
} as const;

/** Um bloco que abre ao tocar no capítulo 9. */
type BlocoServe = { titulo: string; resumo: string; paragrafos: readonly string[] };

/** Capítulo 9: serve para o meu projeto? */
export const SERVE: {
  titulo: string;
  ondeUsar: BlocoServe;
  ondeNaoUsar: BlocoServe;
  comoInstalar: BlocoServe & {
    /** Texto antes do link "Manual Técnico de Instalação" (`SolicitarManual`). */
    antesDoManual: string;
    depoisDoManual: ".";
  };
} = {
  titulo: "Serve para o meu projeto?",
  ondeUsar: {
    titulo: "Onde usar",
    // fonte: [Onde]
    resumo: "Ambientes internos, secos ou úmidos.",
    paragrafos: [
      // fonte: [Onde]
      "Em ambientes internos, secos ou úmidos: salas, quartos, escritórios, corredores, comércio, clínicas, forros e tetos, portas, curvas e colunas. Na cozinha, nas paredes, inclusive no roda-banca e no roda-pia.",
      // fonte: [Onde]
      "Em banheiro e dentro do box também, desde que a base esteja impermeabilizada e a vedação seja contínua nas juntas, cantos, bordas e recortes. O Painel é acabamento e não substitui a impermeabilização.",
    ],
  },
  ondeNaoUsar: {
    titulo: "Onde não usar",
    // fonte: [Onde]
    resumo: "Piso, bancada, áreas externas e calor contínuo.",
    paragrafos: [
      // fonte: [Onde]
      "Piso, tampo de bancada, fachada, áreas externas e semiexternas, borda de piscina e áreas molhadas externas, sauna e sala de vapor, churrasqueira, lareira e coifa, superfícies com impacto ou atrito constante, e lugares com calor contínuo acima de 50 °C ou sol direto contínuo.",
    ],
  },
  comoInstalar: {
    titulo: "Como instalar",
    // fonte: [Instalação]
    resumo: "Parede com cola PU. Teto e forro sempre com fixação mecânica.",
    paragrafos: [
      // fonte: [Instalação]
      "Base firme, seca, limpa e plana, com teste a seco antes da cola.",
      // fonte: [Instalação], [Dono E-5]
      "Na parede, cola PU de alta aderência. A aplicação leva de 2 a 3 horas por cômodo, sem quebradeira.",
      // fonte: [Instalação], [Materiais], decisão do dono 07/11/2026
      "No teto e no forro, sempre com fixação mecânica (cola e parafusos, perfis ou malha híbrida), com cola de contato e espuma expansiva.",
    ],
    // fonte: [Instalação], [Manual]
    antesDoManual:
      "A Orbital fornece o material, e a aplicação fica com o profissional que você escolher e contratar. O passo a passo está no ",
    depoisDoManual: ".",
  },
};

/** Capítulo 10: bambu. A segunda linha do título é a única em itálico da página. */
export const BAMBU: {
  titulo: readonly [string, string];
  frase: string;
} = {
  // fonte: [Nome] (fibra de bambu renovável); segunda linha: fato de domínio público, passa no revisor-tecnico; se reprovar, fica só a primeira
  titulo: ["Fibra de bambu renovável.", "O bambu rebrota depois da colheita."],
  // fonte: [Ficha]
  frase: "Sem formaldeído, para ambientes onde as pessoas vivem e trabalham.",
};

/** Capítulo 11: onde ver e como pedir. */
export const PEDIR: {
  titulo: string;
  frase: string;
  revendas: string;
  orcamento: string;
  botaoConsultor: string;
  reserva: { link: string };
} = {
  titulo: "Onde ver e como pedir",
  // fonte: [Showroom]
  frase: "Veja o PFB aplicado nos showrooms parceiros.",
  // fonte: [Showroom], decisão de 07/11/2026 (4 revendas)
  revendas: "Revendas:",
  // fonte: [Brief §6], [Dono E-6]
  orcamento:
    "Mande a área em m² ou a planta, a linha e o modelo. Um consultor responde com os valores e as condições e, para arquitetos e projetos, vai até o seu escritório com as amostras.",
  botaoConsultor: "Falar com um consultor",
  reserva: { link: "Ver projetos e showrooms" },
};

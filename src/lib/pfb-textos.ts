/**
 * Todo o texto da página do Painel Flexível em Fibra de Bambu (PFB) em
 * /produtos/pfb, por capítulo. Versão 2 (experiência v2, 08/11/2026,
 * .superpowers/sdd/2026-11-08-experiencia-v2/): os textos da spec
 * docs/superpowers/specs/2026-11-07-pfb-experiencia-design.md continuam onde
 * não mudaram; os encurtados e os novos estão marcados "v2" e listados no
 * relatório da v2 (antigo → novo, e por quê). pfb-textos.test.mjs confere as
 * regras (termos proibidos, números, contagens), não mais cada literal.
 *
 * Sem `import`.
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
 * do dono de 07/11/2026 (tabela "Decisões do dono" da spec), [Tec] o conteúdo
 * da antiga /tecnologia (git show f62f8c7^1:src/components/ARTAccordion.tsx e
 * FichaTecnicaAccordion.tsx), de volta por pedido do dono de 08/11/2026.
 */

/** Capítulo 1: abertura. */
export const ABERTURA = {
  // fonte: [PFB], [Nome]
  titulo: "Painel Flexível em Fibra de Bambu (PFB)",
  // fonte: [PFB]; v2: encurtado (a frase inteira da v1 tinha 107 caracteres)
  lead: "Mármore e madeira para paredes e tetos, sem quebradeira.",
  // fonte: [PFB]
  estoque: "Estoque e pronta-entrega em Manaus.",
  botaoModelos: "Ver os modelos",
  botaoConsultor: "Falar com um consultor",
  // fonte: PorQue.tsx:34; obra real: decisão do dono E-2 (06/11/2026); sem "residencial" (revisor-tecnico 07/11/2026)
  alt: "Escada com paredes revestidas com o Painel Flexível em Fibra de Bambu em acabamento de madeira",
} as const;

/** Rótulos comuns às folhas que sobem do rodapé (FolhaPfb). */
export const FOLHA = {
  fechar: "Fechar",
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


/** Capítulo 4: ficha técnica. Cada número com um rótulo curto (v2: de 2 a 5 palavras). */
export const FICHA: {
  titulo: string;
  numeros: ReadonlyArray<{ valor: string; rotulo: string }>;
  ressalva: string;
  rotuloTrilho: string;
} = {
  titulo: "Ficha técnica",
  numeros: [
    // fonte: [Ficha]
    { valor: "72,3 MPa", rotulo: "Resistência à flexão" },
    // fonte: [Ficha], [Dono] (0,2% é absorção de água)
    { valor: "0,2%", rotulo: "Absorção de água em 48 h" },
    // fonte: [Ficha]; v2: "Cerca de 11 kg por placa." vai para a ficha detalhada (Peso por placa)
    { valor: "3,2 kg/m²", rotulo: "Peso por m²" },
    // fonte: [Ficha], D5 (os 550 são do substrato, sem películas e PVC)
    { valor: "550 kg/m³", rotulo: "Densidade do substrato" },
    // fonte: [Ficha]
    { valor: "0,5%", rotulo: "Teor de umidade" },
  ],
  // fonte: [Onde]; v2: a segunda metade da ressalva da v1 (a primeira está na folha do capítulo 9)
  ressalva: "Em banheiro e box, a base precisa estar impermeabilizada.",
  // v2: nome do trilho para o leitor de tela (aria-label)
  rotuloTrilho: "Números da ficha técnica",
};

/** Capítulo 4: a folha da ART (conteúdo da antiga Tecnologia, [Tec] ARTAccordion). */
export const ART: {
  rotulo: string;
  titulo: string;
  oQueE: { titulo: string; texto: string };
  linhas: ReadonlyArray<readonly [string, string]>;
  porQue: { titulo: string; texto: string };
} = {
  // [Tec]: "ART — Anotação de Responsabilidade Técnica" (sem o travessão)
  rotulo: "ART: Anotação de Responsabilidade Técnica",
  titulo: "ART: Anotação de Responsabilidade Técnica",
  oQueE: {
    titulo: "O que é a ART?",
    // [Tec]; o travessão antes de "não é" virou vírgula
    texto:
      "A Anotação de Responsabilidade Técnica é um documento obrigatório emitido pelo CREA que vincula um engenheiro habilitado às responsabilidades técnicas de um produto ou projeto. É a garantia de que o PFB Orbital foi avaliado, testado e aprovado por um profissional de engenharia, e não um simples laudo comercial.",
  },
  linhas: [
    // [Tec], [Ficha] (o mesmo número e o mesmo engenheiro)
    ["Número da ART", "AM20260593657"],
    ["Responsável técnico", "Eng. Civil Werksson Sousa"],
    ["Registro CREA", "042030134-8-D"],
    ["Escopo de aplicação", "Revestimento de parede e forro de teto"],
    // [Tec]; "inchamento" virou "absorção de água" ([Ficha], dono 06/11/2026)
    ["Ensaios realizados", "Resistência à flexão, absorção de água, densidade, umidade, ciclos térmicos"],
    // [Tec]; o travessão virou vírgula
    ["Validade", "Documentação ativa, disponível mediante solicitação"],
  ],
  porQue: {
    titulo: "Por que isso importa?",
    // [Tec]; o travessão virou vírgula. Dono 08/11/2026: saiu "É o único revestimento laminado de bambu com essa certificação no Amazonas" (sem fonte)
    texto:
      "Com a ART, o PFB Orbital pode ser especificado em projetos de arquitetura e engenharia com respaldo técnico formal, exigido em obras comerciais, clínicas, condomínios e projetos públicos.",
  },
};

/** Capítulo 4: a folha da ficha técnica detalhada ([Tec] FichaTecnicaAccordion). */
export const FICHA_DETALHADA: {
  rotulo: string;
  titulo: string;
  grupos: ReadonlyArray<{ titulo: string; linhas: ReadonlyArray<readonly [string, string]> }>;
  notas: readonly string[];
  garantia: readonly [string, string];
} = {
  // [Tec]: "Ficha Técnica Detalhada — PFB Orbital"
  rotulo: "Ficha técnica detalhada",
  titulo: "Ficha técnica detalhada",
  grupos: [
    {
      titulo: "Dimensões e formato",
      linhas: [
        ["Comprimento", "2,90 m"],
        ["Largura", "1,20 m"],
        ["Espessura", "5 mm"],
        ["Área por placa", "3,48 m²"],
        ["Peso por placa", "≈ 11 kg"],
        ["Número de camadas", "5 camadas"],
      ],
    },
    {
      titulo: "Propriedades mecânicas",
      linhas: [
        ["Resistência à flexão", "72,3 MPa"],
        // [Tec] "Densidade"; D5: os 550 são do substrato
        ["Densidade do substrato", "550 kg/m³"],
        ["Peso por m²", "3,2 kg/m²"],
        ["Módulo de elasticidade", "Alta rigidez longitudinal"],
      ],
    },
    {
      titulo: "Comportamento com água",
      linhas: [
        // [Tec] "Inchamento (48h imerso)"; dono 06/11/2026: é absorção
        ["Absorção de água (48 h imerso)", "0,2%"],
        ["Teor de umidade interno", "0,5%"],
        // [Tec] "Mínima — film PVC impermeável": sem travessão e sem "impermeável" (regra da spec); dono 08/11/2026: "filme"
        ["Absorção superficial", "Mínima, filme de PVC na superfície"],
        ["Comportamento em chuva", "Não recomendado para exterior direto"],
      ],
    },
    {
      titulo: "Resistência e durabilidade",
      linhas: [
        ["Vida útil estimada", "10+ anos no clima amazônico"],
        // [Tec] "–10°C": o traço era um travessão curto; aqui é o sinal de menos
        ["Ciclos térmicos", "Testado de −10 °C a +120 °C"],
        // [Tec] "sem impacto estrutural": sem "estrutural" (dono 06/11/2026)
        ["Contato térmico breve", "Até 100 °C sem dano à placa"],
        ["Calor contínuo", "Validado para uso interno. Acima de 50 °C, pode ondular"],
        ["Resistência a fungos", "Anti-mofo: o bambu não é substrato fúngico"],
        ["Resistência a pragas", "Anti-cupim: fibra processada sem atração"],
        // [Tec] "Resistência UV" saiu: sem "UV" ([Ficha], dono 06/11/2026)
      ],
    },
    {
      titulo: "Composição e segurança",
      linhas: [
        // [Ficha] 5 camadas, de baixo para cima; [Tec] tinha 4 linhas
        ["Substrato", "Fibra de bambu laminada"],
        // [Tec] "Camada estrutural: PVC estrutural de alta densidade": sem "estrutural"
        ["Camada de PVC", "PVC de alta densidade"],
        // [Ficha]: a terceira camada, que a [Tec] não listava
        ["Adesivo", "Adesivo de alta aderência"],
        // [Tec] "Film PVC": "película", o nome da camada no [Ficha]
        ["Acabamento visual", "Película de PVC com impressão fotorrealista"],
        // [Tec] "Film UV anti-risco": sem "UV"
        ["Proteção superficial", "Película protetora anti-risco"],
        ["Formaldeído (VOC)", "Ausente, formulação sem formol"],
        ["Odor", "Inodoro, seguro em ambientes habitados"],
      ],
    },
    {
      titulo: "Aplicação e restrições",
      linhas: [
        ["Parede interna", "Recomendado"],
        ["Forro de teto interno", "Recomendado"],
        // [Tec] tinha "Fachada interna: Permitido" e "Fachada externa: Não recomendado"; [Onde]: o PFB não vai na fachada
        ["Fachada e áreas externas", "Não indicado"],
        ["Piso", "Não indicado"],
        // [Tec] "Banheiros, cozinhas, áreas de serviço"; [Onde]: banheiro só com a base impermeabilizada
        ["Ambientes úmidos", "Banheiro e box com a base impermeabilizada, cozinhas, áreas de serviço"],
        // [Tec] "Cola de contato (tetos)"; decisão do dono 07/11/2026: teto sempre com fixação mecânica
        ["Instalação", "Cola PU na parede. No teto, fixação mecânica com cola de contato"],
        // [Tec] "2–3 horas"
        ["Tempo por cômodo", "2 a 3 horas"],
      ],
    },
  ],
  notas: [
    // [Tec], sem os travessões
    "Validado para uso interno. O aquecimento contínuo, por sol direto ou indireto, acima de 50 °C pode gerar leve ondulação, conforme o local e a aplicação.",
    // [Tec], sem o travessão; o ±10% volta por pedido do dono (08/11/2026)
    "Peso e densidade admitem tolerância de ±10%: o bambu é fibra natural e cada lote varia. Padrão em materiais de fibra vegetal.",
    // [Tec]
    "Dados extraídos de ficha técnica laboratorial e ART nº AM20260593657 · CREA 042030134-8-D",
  ],
  // fonte: [Garantia] (a linha "Garantia" da ficha completa da v1)
  garantia: [
    "Garantia",
    "Garantia legal do Código de Defesa do Consumidor contra vício de fabricação. Confira as placas na entrega: placa com defeito aparente não deve ser instalada; avise a Orbital por escrito, com fotos, antes de aplicar.",
  ],
};

/** Capítulo 5: teste de água. */
export const AGUA: {
  titulo: string;
  frase: string;
  controle: string;
  horas: ReadonlyArray<{ rotulo: "0h" | "24h" | "48h"; alt: string }>;
} = {
  titulo: "Teste de água",
  // fonte: [Ficha] (0,2% em 48 h, absorção); v2: uma frase em vez de duas
  frase: "48 horas na água, 0,2% de absorção.",
  // v2: nome do controle de arrastar (aria-label)
  controle: "Horas na água",
  horas: [
    // fonte: D2 (fotos do teste; a comparação com o MDF foi liberada só aqui)
    { rotulo: "0h", alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, no começo do teste de água, imagem gerada por IA" },
    // fonte: D2
    { rotulo: "24h", alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 24 horas na água, imagem gerada por IA" },
    // fonte: D2
    { rotulo: "48h", alt: "Placa do Painel, à esquerda, e placa de MDF, à direita, depois de 48 horas na água, imagem gerada por IA" },
  ],
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


/** Capítulo 9: serve para o meu projeto? */
export const SERVE: {
  titulo: string;
  ondeUsar: { titulo: string; ambientes: readonly string[]; paragrafos: readonly string[] };
  ondeNaoUsar: { titulo: string; ambientes: readonly string[]; paragrafos: readonly string[] };
  comoInstalar: {
    titulo: string;
    passos: ReadonlyArray<{ titulo: string; texto: string }>;
    paragrafos: readonly string[];
    /** Texto antes do link "Manual Técnico de Instalação" (`SolicitarManual`). */
    antesDoManual: string;
    depoisDoManual: ".";
  };
  rotuloFolha: string;
  rotuloPassos: string;
} = {
  titulo: "Serve para o meu projeto?",
  ondeUsar: {
    titulo: "Onde usar",
    // fonte: [Onde]; v2: os ambientes do parágrafo, em palavras soltas
    ambientes: ["Salas e quartos", "Escritórios", "Comércio e clínicas", "Forros e tetos", "Portas, curvas e colunas", "Cozinha", "Banheiro e box, com a base impermeabilizada"],
    paragrafos: [
      // fonte: [Onde]
      "Em ambientes internos, secos ou úmidos: salas, quartos, escritórios, corredores, comércio, clínicas, forros e tetos, portas, curvas e colunas. Na cozinha, nas paredes, inclusive no roda-banca e no roda-pia.",
      // fonte: [Onde]
      "Em banheiro e dentro do box também, desde que a base esteja impermeabilizada e a vedação seja contínua nas juntas, cantos, bordas e recortes. O Painel é acabamento e não substitui a impermeabilização.",
    ],
  },
  ondeNaoUsar: {
    titulo: "Onde não usar",
    // fonte: [Onde]; v2: os lugares do parágrafo, em palavras soltas
    ambientes: ["Piso e bancada", "Fachada e áreas externas", "Borda de piscina", "Sauna e vapor", "Churrasqueira, lareira e coifa", "Calor ou sol direto contínuo"],
    paragrafos: [
      // fonte: [Onde]
      "Piso, tampo de bancada, fachada, áreas externas e semiexternas, borda de piscina e áreas molhadas externas, sauna e sala de vapor, churrasqueira, lareira e coifa, superfícies com impacto ou atrito constante, e lugares com calor contínuo acima de 50 °C ou sol direto contínuo.",
    ],
  },
  comoInstalar: {
    titulo: "Como instalar",
    // fonte: [Instalação], [Dono E-5], decisão do dono 07/11/2026; v2: os três parágrafos em três passos curtos
    passos: [
      { titulo: "Base", texto: "Firme, seca, limpa e plana, com teste a seco antes da cola." },
      { titulo: "Parede", texto: "Cola PU de alta aderência, de 2 a 3 horas por cômodo." },
      { titulo: "Teto e forro", texto: "Sempre com fixação mecânica." },
    ],
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
  // v2: a linha que abre a folha com os textos inteiros
  rotuloFolha: "Detalhes de uso e instalação",
  // v2: nome do trilho dos passos (aria-label)
  rotuloPassos: "Passos da instalação",
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
  // fonte: textos aprovados de /onde-comprar (seção 6, "Revendas em Manaus"); link para a página
  revendas: "Revendas em Manaus",
  // fonte: [Brief §6], [Dono E-6]; v2: encurtado (mesmos fatos)
  orcamento:
    "Mande a área ou a planta, a linha e o modelo. Um consultor responde com valores e condições e, para arquitetos, vai ao escritório com as amostras.",
  botaoConsultor: "Falar com um consultor",
  reserva: { link: "Ver projetos e showrooms" },
};

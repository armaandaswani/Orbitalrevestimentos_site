import { lerProjetos } from "@/lib/projetos-dados";
import { CARTOES_PARCERIA, PERFIS, type PerfilSlug } from "@/lib/parcerias-textos";

/**
 * Fotos das páginas de parceria: capas de obras reais, lidas do banco como em
 * /projetos. Se o banco falhar ou a obra sair do ar, vale a foto local
 * (parcerias-textos): a página de cadastro nunca quebra por causa da foto.
 * "revendedores" é o cartão da porta de entrada, com a foto de um showroom.
 */
export type ChaveCapa = PerfilSlug | "revendedores";

const OBRA: Record<ChaveCapa, string> = {
  arquitetos: "pe-direito-duplo-residencial",
  marceneiros: "rascunho-mw3nlo2d", // Salão de Festas
  engenheiros: "escritorio-juridico",
  revendedores: "ornare-salao-principal",
};

export interface Capa {
  src: string;
  alt: string;
  /** object-position, a partir do foco da capa escolhido no admin. */
  foco: string;
}

export async function capasDeParceria(): Promise<Record<ChaveCapa, Capa>> {
  const revenda = CARTOES_PARCERIA.find((c) => c.nome === "Revendedores")!;
  const capas = {
    ...Object.fromEntries(PERFIS.map((p) => [p.slug, { src: p.imagem, alt: p.alt, foco: "50% 50%" }])),
    revendedores: { src: revenda.imagem, alt: revenda.alt, foco: "50% 50%" },
  } as Record<ChaveCapa, Capa>;
  try {
    const projetos = await lerProjetos();
    for (const chave of Object.keys(OBRA) as ChaveCapa[]) {
      const obra = projetos.find((x) => x.slug === OBRA[chave]);
      if (!obra?.image_after) continue;
      const x = typeof obra.cover_focus_x === "number" ? obra.cover_focus_x : 0.5;
      const y = typeof obra.cover_focus_y === "number" ? obra.cover_focus_y : 0.5;
      capas[chave] = {
        src: obra.image_after,
        alt: `${obra.title}: obra com o Painel Flexível em Fibra de Bambu`,
        foco: `${Math.round(x * 100)}% ${Math.round(y * 100)}%`,
      };
    }
  } catch (e) {
    console.error("[parcerias] capas:", e instanceof Error ? e.message : e);
  }
  return capas;
}

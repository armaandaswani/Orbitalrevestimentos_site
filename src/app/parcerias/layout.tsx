import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parcerias — Arquitetos, Marceneiros e Designers em Manaus",
  description:
    "Programa de parcerias da Orbital Revestimentos para arquitetos, designers de interiores, marceneiros, engenheiros e revendedores em Manaus. Amostras grátis, fichas técnicas com ART/CREA e condições exclusivas.",
  keywords: [
    "parceria arquiteto Manaus",
    "arquitetos em Manaus revestimento",
    "designer de interiores Manaus",
    "revestimento para arquiteto",
    "especificar revestimento PFB",
    "marceneiro Manaus revestimento",
    "engenheiro civil revestimento Manaus",
    "revender revestimento Manaus",
    "revestimento com ART CREA Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/parcerias" },
  openGraph: {
    title: "Parcerias — Arquitetos, Marceneiros e Designers em Manaus",
    description:
      "Condições exclusivas para arquitetos, designers e marceneiros em Manaus. Amostras grátis, ART/CREA e suporte técnico da Orbital Revestimentos.",
    url: "https://orbitalrevestimentos-site.vercel.app/parcerias",
  },
};

export default function ParceriasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

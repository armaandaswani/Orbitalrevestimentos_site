import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Parcerias — Para Arquitetos, Marceneiros, Engenheiros e Revendedores",
  description:
    "Programa de parcerias Orbital Revestimentos. Condições especiais para arquitetos, marceneiros, engenheiros e revendedores. Documentação técnica, ART e suporte completo.",
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/parcerias" },
  openGraph: {
    title: "Parcerias — Para Arquitetos, Marceneiros, Engenheiros e Revendedores",
    description:
      "Condições exclusivas para profissionais e revendedores. Documentação técnica, ART e suporte da Orbital Revestimentos.",
    url: "https://orbitalrevestimentos-site.vercel.app/parcerias",
  },
};

export default function ParceriasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

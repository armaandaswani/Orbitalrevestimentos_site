import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulador de Custo — Orçamento de Revestimento em Manaus",
  description:
    "Calcule o custo do seu projeto de revestimento PFB Orbital em segundos. Informe as dimensões, escolha o acabamento e receba o orçamento na hora. Atendimento em Manaus.",
  keywords: [
    "orçamento revestimento Manaus",
    "calcular revestimento parede",
    "quanto custa revestimento Manaus",
    "simulador revestimento",
    "preço revestimento PFB",
    "orçamento decoração Manaus",
    "quanto custa reformar parede Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/contato" },
  openGraph: {
    title: "Simulador de Custo — Orçamento de Revestimento em Manaus",
    description:
      "Calcule o custo do seu projeto agora. Informe as medidas, escolha o acabamento e receba o orçamento na hora.",
    url: "https://orbitalrevestimentos-site.vercel.app/contato",
  },
};

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

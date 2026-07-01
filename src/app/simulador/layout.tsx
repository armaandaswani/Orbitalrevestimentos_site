import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gere seu Orçamento — Simule o Investimento do seu Projeto",
  description:
    "Gere seu orçamento agora: simule o investimento do seu projeto de revestimento PFB Orbital em segundos. Informe as dimensões, escolha o acabamento e receba o valor na hora. Atendimento em Manaus.",
  keywords: [
    "orçamento revestimento Manaus",
    "calcular revestimento parede",
    "quanto custa revestimento Manaus",
    "simulador revestimento",
    "preço revestimento PFB",
    "orçamento decoração Manaus",
    "quanto custa reformar parede Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos.com.br/simulador" },
  openGraph: {
    title: "Gere seu Orçamento — Simule o Investimento do seu Projeto",
    description:
      "Simule o investimento do seu projeto agora. Informe as medidas, escolha o acabamento e receba o orçamento na hora.",
    url: "https://orbitalrevestimentos.com.br/simulador",
  },
};

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulador de Custo — Calcule seu Revestimento PFB",
  description:
    "Calcule o custo do seu projeto de revestimento PFB Orbital em segundos. Informe as dimensões do ambiente e escolha o acabamento. Orçamento instantâneo, sem compromisso.",
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/contato" },
  openGraph: {
    title: "Simulador de Custo — Calcule seu Revestimento PFB",
    description:
      "Simule o custo do seu projeto agora. Informe as medidas, escolha o acabamento e receba o orçamento na hora.",
    url: "https://orbitalrevestimentos-site.vercel.app/contato",
  },
};

export default function ContatoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

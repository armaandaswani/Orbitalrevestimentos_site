import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projetos em Manaus — Antes e Depois com Revestimento PFB",
  description:
    "Galeria de projetos reais executados com PFB Orbital em Manaus: lavabos, escritórios, restaurantes, cozinhas e embarcações náuticas. Transformação antes e depois sem obra.",
  keywords: [
    "projetos revestimento Manaus",
    "antes e depois revestimento",
    "revestimento lavabo Manaus",
    "revestimento banheiro antes depois",
    "revestimento restaurante Manaus",
    "revestimento escritório Manaus",
    "revestimento náutico Manaus",
    "reforma sem obra Manaus",
    "transformação ambiente revestimento",
    "revestimento residencial Manaus",
    "revestimento comercial Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/projetos" },
  openGraph: {
    title: "Projetos em Manaus — Antes e Depois com Revestimento PFB",
    description:
      "Galeria real de projetos com PFB Orbital em Manaus: lavabos, restaurantes, escritórios e náutico. Transformações antes e depois sem obra.",
    url: "https://orbitalrevestimentos-site.vercel.app/projetos",
    images: [
      {
        url: "/images/projetos/restaurante-depois.jpeg",
        width: 1200,
        height: 800,
        alt: "Restaurante revestido com PFB Orbital — Imbuia Elegance",
      },
    ],
  },
};

export default function ProjetosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

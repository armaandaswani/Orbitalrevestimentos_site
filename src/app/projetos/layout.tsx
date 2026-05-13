import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projetos — Antes e Depois com Revestimento PFB Orbital",
  description:
    "Galeria de projetos executados com PFB Orbital em Manaus: lavabos, escritórios, restaurantes, cozinhas e embarcações náuticas. Veja a transformação real antes e depois.",
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/projetos" },
  openGraph: {
    title: "Projetos — Antes e Depois com Revestimento PFB Orbital",
    description:
      "Galeria real de projetos com PFB Orbital: residencial, comercial e náutico. Veja as transformações antes e depois.",
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

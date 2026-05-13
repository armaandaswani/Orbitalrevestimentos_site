import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos — 3 Linhas, 15 Acabamentos de Revestimento PFB",
  description:
    "Explore o catálogo completo de Placas Flexíveis de Bambu Orbital. Linha Classic (mármore fosco), Brilliance (mármore polido) e Elegance (madeira texturizada). Pronta-entrega em Manaus.",
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/produtos" },
  openGraph: {
    title: "Produtos — 3 Linhas, 15 Acabamentos de Revestimento PFB",
    description:
      "Catálogo completo de revestimentos PFB Orbital: Classic, Brilliance e Elegance. 15 acabamentos, pronta-entrega em Manaus.",
    url: "https://orbitalrevestimentos-site.vercel.app/produtos",
  },
};

export default function ProdutosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

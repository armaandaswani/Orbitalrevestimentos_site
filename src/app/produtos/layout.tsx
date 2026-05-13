import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revestimentos PFB — 3 Linhas, 15 Acabamentos em Manaus",
  description:
    "Catálogo completo de Placas Flexíveis de Bambu Orbital: Linha Classic (mármore fosco), Brilliance (mármore polido) e Elegance (madeira texturizada). Alternativa superior ao MDF e papel de parede. Pronta-entrega em Manaus.",
  keywords: [
    "revestimento de parede Manaus",
    "revestimento mármore Manaus",
    "revestimento madeira Manaus",
    "painel decorativo Manaus",
    "placa de revestimento para parede",
    "revestimento fosco",
    "revestimento polido",
    "revestimento texturizado",
    "alternativa MDF parede",
    "alternativa papel de parede",
    "revestimento para lavabo",
    "revestimento para sala",
    "revestimento para banheiro Manaus",
    "comprar revestimento Manaus",
    "loja de revestimentos Manaus",
  ],
  alternates: { canonical: "https://orbitalrevestimentos-site.vercel.app/produtos" },
  openGraph: {
    title: "Revestimentos PFB — 3 Linhas, 15 Acabamentos em Manaus",
    description:
      "Catálogo completo Orbital: Classic, Brilliance e Elegance. Alternativa superior ao MDF e papel de parede. 15 acabamentos, pronta-entrega em Manaus.",
    url: "https://orbitalrevestimentos-site.vercel.app/produtos",
  },
};

const productSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "PFB Orbital Linha Classic — Revestimento Mármore Fosco",
    description:
      "Placa Flexível de Bambu com acabamento mármore fosco para revestimento de parede e forro. Impermeável, anti-mofo, anti-cupim. Instalação em 2–3h. Pronta-entrega em Manaus.",
    brand: { "@type": "Brand", name: "Orbital Revestimentos" },
    material: "Fibra de Bambu",
    color: "Mármore Fosco",
    size: "1,2m × 2,9m × 5mm",
    offers: {
      "@type": "Offer",
      price: "559",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Orbital Revestimentos" },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "PFB Orbital Linha Brilliance — Revestimento Mármore Polido",
    description:
      "Placa Flexível de Bambu com acabamento mármore polido para revestimento de parede. 8 acabamentos. Impermeável, sem obra. Pronta-entrega em Manaus.",
    brand: { "@type": "Brand", name: "Orbital Revestimentos" },
    material: "Fibra de Bambu",
    color: "Mármore Polido",
    size: "1,2m × 2,9m × 5mm",
    offers: {
      "@type": "Offer",
      price: "589",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Orbital Revestimentos" },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "PFB Orbital Linha Elegance — Revestimento Madeira Texturizada",
    description:
      "Placa Flexível de Bambu com textura de madeira para revestimento de parede e forro de teto. Anti-cupim, anti-mofo. Pronta-entrega em Manaus.",
    brand: { "@type": "Brand", name: "Orbital Revestimentos" },
    material: "Fibra de Bambu",
    color: "Madeira Texturizada",
    size: "1,2m × 2,9m × 5mm",
    offers: {
      "@type": "Offer",
      price: "649",
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Orbital Revestimentos" },
    },
  },
];

export default function ProdutosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {productSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}

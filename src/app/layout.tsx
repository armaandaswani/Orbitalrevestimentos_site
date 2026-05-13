import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-serif",
  display: "swap",
});

const BASE_URL = "https://orbitalrevestimentos-site.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Orbital Revestimentos — Placas Flexíveis de Bambu em Manaus",
    template: "%s | Orbital Revestimentos",
  },
  description:
    "Revestimentos eco-premium para paredes e tetos em Manaus. Placas Flexíveis de Bambu (PFB) com acabamento arquitetônico — impermeável, anti-mofo, instalado em 2–3 horas. 3 linhas, 15 acabamentos.",
  keywords: [
    "Orbital Revestimentos",
    "revestimento parede Manaus",
    "revestimento teto Manaus",
    "revestimento de parede",
    "revestimento de forro",
    "forro de teto decorativo",
    "revestimento sem obra",
    "revestimento sem demolição",
    "placa flexível de bambu",
    "PFB revestimento",
    "alternativa ao MDF",
    "melhor que MDF",
    "MDF revestimento parede",
    "papel de parede Manaus",
    "alternativa papel de parede",
    "papel de parede impermeável",
    "revestimento impermeável banheiro",
    "revestimento lavabo",
    "revestimento cozinha",
    "revestimento sala",
    "revestimento mármore",
    "revestimento madeira",
    "painel decorativo parede",
    "revestimento 3D",
    "acabamento arquitetônico",
    "arquiteto Manaus",
    "arquitetos em Manaus",
    "designer de interiores Manaus",
    "revestimento para arquiteto",
    "revestimento ecológico",
    "revestimento bambu",
    "revestimento comercial Manaus",
    "revestimento para restaurante",
    "revestimento para escritório",
    "revestimento náutico",
    "decoração de interiores Manaus",
    "renovar parede sem obra",
    "loja de revestimentos Manaus",
  ],
  authors: [{ name: "Orbital Revestimentos", url: BASE_URL }],
  creator: "Orbital Revestimentos",
  publisher: "Orbital Revestimentos",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: BASE_URL,
    siteName: "Orbital Revestimentos",
    title: "Orbital Revestimentos — Placas Flexíveis de Bambu em Manaus",
    description:
      "Revestimentos eco-premium para paredes e tetos. Instalado em 2–3 horas, sem obra. 3 linhas, 15 acabamentos. Pronta-entrega em Manaus.",
    images: [
      {
        url: "/images/catalogue/hero-cover.png",
        width: 1200,
        height: 630,
        alt: "Orbital Revestimentos — PFB instalado em interior premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbital Revestimentos — Placas Flexíveis de Bambu em Manaus",
    description:
      "Revestimentos eco-premium para paredes e tetos. Instalado em 2–3 horas, sem obra. 3 linhas, 15 acabamentos.",
    images: ["/images/catalogue/hero-cover.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  other: {
    "geo.region": "BR-AM",
    "geo.placename": "Manaus",
    "geo.position": "-3.1019;-60.025",
    "ICBM": "-3.1019, -60.025",
  },
};

const jsonLdSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Orbital Revestimentos",
    description:
      "Fornecedor exclusivo de Placas Flexíveis de Bambu (PFB) em Manaus. Revestimento de parede e forro de teto — alternativa superior ao MDF, papel de parede e forro PVC.",
    url: BASE_URL,
    telephone: "+55-92-98815-0149",
    email: "orbital.revestimentos@gmail.com",
    image: `${BASE_URL}/images/catalogue/hero-cover.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Manaus",
      addressRegion: "AM",
      addressCountry: "BR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -3.1019,
      longitude: -60.025,
    },
    areaServed: {
      "@type": "State",
      name: "Amazonas",
    },
    sameAs: [
      "https://instagram.com/orbitalrevestimentos",
      "https://wa.me/5592988150149",
    ],
    priceRange: "R$559–R$649",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Coleção PFB Orbital",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Linha Classic — Mármore Fosco",
            description:
              "Revestimento de parede com acabamento mármore fosco. Impermeável, anti-mofo, instalado em 2h.",
          },
          price: "559",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Linha Brilliance — Mármore Polido",
            description:
              "Revestimento de parede com acabamento mármore polido. 8 acabamentos. Impermeável.",
          },
          price: "589",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Linha Elegance — Madeira Texturizada",
            description:
              "Revestimento de parede e forro com textura de madeira. 4 acabamentos. Anti-cupim.",
          },
          price: "649",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Orbital Revestimentos",
    url: BASE_URL,
    logo: `${BASE_URL}/images/logo.png`,
    description:
      "Importadora especializada em revestimentos eco-premium de Placas Flexíveis de Bambu (PFB) para paredes e forros. Manaus, Amazonas.",
    foundingLocation: "Manaus, AM, Brasil",
    sameAs: [
      "https://instagram.com/orbitalrevestimentos",
      "https://wa.me/5592988150149",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+55-92-98815-0149",
      contactType: "sales",
      availableLanguage: "Portuguese",
      areaServed: "BR",
    },
    knowsAbout: [
      "revestimento de parede",
      "revestimento de forro",
      "Placas Flexíveis de Bambu",
      "PFB",
      "alternativa ao MDF",
      "revestimento impermeável",
      "decoração de interiores Manaus",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Orbital Revestimentos",
    url: BASE_URL,
    description:
      "Revestimento de parede e forro de teto em Manaus — Placas Flexíveis de Bambu (PFB). Alternativa superior ao MDF, papel de parede e forro PVC.",
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "Orbital Revestimentos",
    },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased font-[var(--font-inter)]">
        {jsonLdSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

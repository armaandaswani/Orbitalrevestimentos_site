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
    "revestimento parede Manaus",
    "revestimento teto Manaus",
    "placa flexível de bambu",
    "PFB revestimento",
    "revestimento sem obra",
    "revestimento impermeável banheiro",
    "revestimento mármore",
    "revestimento madeira",
    "acabamento arquitetônico",
    "revestimento ecológico",
    "revestimento bambu",
    "placas para parede",
    "revestimento lavabo",
    "revestimento comercial",
    "Orbital Revestimentos",
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
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Orbital Revestimentos",
  description:
    "Importadora especializada em Placas Flexíveis de Bambu (PFB) premium para revestimentos de paredes e tetos com acabamento arquitetônico.",
  url: BASE_URL,
  telephone: "+55-92-98815-0149",
  email: "orbital.revestimentos@gmail.com",
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
  sameAs: [
    "https://instagram.com/orbitalrevestimentos",
    `https://wa.me/5592988150149`,
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
          description: "Placas Flexíveis de Bambu com acabamento mármore fosco. 3 opções de cor.",
        },
        price: "559",
        priceCurrency: "BRL",
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: "Linha Brilliance — Mármore Polido",
          description: "Placas Flexíveis de Bambu com acabamento mármore polido. 8 opções de cor.",
        },
        price: "589",
        priceCurrency: "BRL",
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: "Linha Elegance — Madeira Texturizada",
          description: "Placas Flexíveis de Bambu com textura de madeira. 4 opções de cor.",
        },
        price: "649",
        priceCurrency: "BRL",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased font-[var(--font-inter)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import SiteChrome from "@/components/SiteChrome";
import ContatoSheet from "@/components/ContatoSheet";
import Movimento from "@/components/movimento/Movimento";
import IntroOrbita from "@/components/movimento/IntroOrbita";
import TransicaoPagina from "@/components/movimento/TransicaoPagina";
import { SCRIPT_ESPERA_URL } from "@/lib/projetos-tipos";
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

const BASE_URL = "https://orbitalrevestimentos.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Orbital Revestimentos — Painéis Flexíveis em Fibra de Bambu em Manaus",
    template: "%s | Orbital Revestimentos",
  },
  description:
    "Novas possibilidades para seus projetos. Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros em Manaus: acabamento arquitetônico, resistente à umidade, instalado em horas, sem obra. 3 linhas, 15 acabamentos.",
  keywords: [
    "Orbital Revestimentos",
    "revestimento parede Manaus",
    "revestimento teto Manaus",
    "revestimento de parede",
    "revestimento de forro",
    "forro de teto decorativo",
    "revestimento sem obra",
    "revestimento sem demolição",
    "painel flexível fibra de bambu",
    "PFB revestimento",
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
    title: "Orbital Revestimentos — Painéis Flexíveis em Fibra de Bambu em Manaus",
    description:
      "Novas possibilidades para seus projetos. Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros, instalados em horas, sem obra. 3 linhas, 15 acabamentos, pronta-entrega em Manaus.",
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
    title: "Orbital Revestimentos — Painéis Flexíveis em Fibra de Bambu em Manaus",
    description:
      "Novas possibilidades para seus projetos. Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros, instalados em horas, sem obra.",
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
      "Fornecedor exclusivo de Painéis Flexíveis em Fibra de Bambu (PFB) em Manaus. Revestimento de parede e forro de teto pensado para o clima amazônico. Novas possibilidades para seus projetos.",
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
    // Sem preço nos dados estruturados: o site público não mostra valores
    // (decisão do dono, out/2026). Valores só com o consultor.
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
    logo: `${BASE_URL}/images/brand/orbital-simbolo.png`,
    description:
      "Importadora especializada em revestimentos eco-premium de Painéis Flexíveis em Fibra de Bambu (PFB) para paredes e forros. Manaus, Amazonas.",
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
      "Painéis Flexíveis em Fibra de Bambu",
      "PFB",
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
      "Revestimento de parede e forro de teto em Manaus — Painéis Flexíveis em Fibra de Bambu (PFB). Novas possibilidades para seus projetos.",
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
    // suppressHydrationWarning: o porteiro da intro liga data-intro no <html>
    // antes da hidratação; só esse nível é silenciado, não os filhos.
    // data-scroll-behavior="smooth": o Next 16 só desliga a rolagem suave do
    // <html> durante a troca de rota com este atributo. Sem ele, a página nova
    // descia do rodapé até o topo devagar, e a transição fotografava o rodapé.
    <html lang="pt-BR" className={`${inter.variable} ${notoSerif.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-TGJWER2Y1K"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TGJWER2Y1K');
          `}
        </Script>
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1031009402737517');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{display:"none"}}
            src="https://www.facebook.com/tr?id=1031009402737517&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body className="min-h-screen flex flex-col bg-[#F6F5F2] text-[#0D1830] antialiased">
        {/* Primeiro filho do body: o porteiro inline roda antes da primeira
            pintura. Fora do SiteChrome; o próprio porteiro pula /admin, /parceiro,
            /representante e /o. */}
        <IntroOrbita />
        {/* /projetos?categoria=… ou ?ver=…: a grade espera invisível pelo filtro da URL (só em /projetos). */}
        <script id="projetos-espera-url" dangerouslySetInnerHTML={{ __html: SCRIPT_ESPERA_URL }} />
        {jsonLdSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <SiteChrome>
          <Navbar />
          <Movimento />
        </SiteChrome>
        {/* A página troca dentro de um <ViewTransition>: a antiga se dissolve,
            a nova sobe; o cabeçalho e o rodapé ficam fora. */}
        <TransicaoPagina>
          <div className="flex-1">{children}</div>
        </TransicaoPagina>
        <SiteChrome>
          <Footer />
          <ChatWidget />
          <ContatoSheet />
        </SiteChrome>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}

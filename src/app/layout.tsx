import type { Metadata } from "next";
import { Inter, Noto_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

export const metadata: Metadata = {
  title: "Orbital Revestimentos — Instalado em horas. Admirado por anos.",
  description:
    "Placas Flexíveis de Bambu (PFB) premium para transformar paredes e tetos com acabamento arquitetônico. 3 linhas, 15 acabamentos. Pronta-entrega em Manaus.",
  keywords: "revestimentos, bambu, PFB, paredes, tetos, Manaus, arquitetura, interior",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${notoSerif.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#f9f9f9] text-[#1a1c1c] antialiased font-[var(--font-inter)]">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
        <SpeedInsights />
      </body>
    </html>
  );
}

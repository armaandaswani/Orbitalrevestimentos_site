import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê métricas de fonte (.afm) do node_modules em runtime. Mantê-lo como
  // pacote externo (não empacotado) garante que os .afm resolvam normalmente em
  // TODAS as rotas serverless (pedidos E orçamento) — fix robusto do ENOENT.
  serverExternalPackages: ["pdfkit"],
  images: {
    localPatterns: [
      { pathname: "/images/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hjyquuhlnswzftqpebdi.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // pdfkit reads its built-in font metrics (.afm) from node_modules at runtime.
  // Vercel's serverless tracing doesn't detect these dynamic reads, so the
  // send-document PDF failed in production with
  //   ENOENT ... /node_modules/pdfkit/js/data/Helvetica.afm
  // Force them into the function bundle for the only route that generates PDFs.
  outputFileTracingIncludes: {
    "/api/admin/pedidos/**": ["./node_modules/pdfkit/js/data/**/*"],
    // Formal quote PDF (public funnel) generates PDFs the same way.
    "/api/orcamento/**": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;

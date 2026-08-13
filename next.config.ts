import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê métricas de fonte (.afm) do node_modules em runtime. Mantê-lo como
  // pacote externo (não empacotado) garante que os .afm resolvam normalmente em
  // TODAS as rotas serverless (pedidos E orçamento) — fix robusto do ENOENT.
  serverExternalPackages: ["pdfkit"],
  images: {
    // O padrão vai até 3840, mas os originais no storage têm no máximo 2400px
    // (ver scripts/comprimir-storage.ts). Larguras acima disso só produzem mais
    // uma variante para transformar, guardar e transferir da origem, sem ganho
    // nenhum de nitidez. Cortar as duas maiores reduz um quarto das variantes.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Rede de segurança: hoje os objetos do Supabase vêm com max-age de 1 ano e
    // o Next respeita o maior valor entre este e o do upstream. Se algum upload
    // futuro subir sem esse cabeçalho, o padrão de 4 h faria a edge rebuscar o
    // original várias vezes por dia — foi assim que os 10 GB evaporaram.
    minimumCacheTTL: 31536000,
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

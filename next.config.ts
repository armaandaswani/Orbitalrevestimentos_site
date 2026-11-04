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
  // Cabeçalhos de segurança. A CSP vai só
  // em Report-Only: nada quebra enquanto as violações são observadas no
  // console (e, com um report-uri, num coletor). Os hosts são os que o site
  // usa hoje: Supabase Storage, Vercel Analytics/Speed Insights, GA4, Meta
  // Pixel, YouTube (vídeos e miniaturas) e o chat (same-origin, /api/chat).
  async headers() {
    const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hjyquuhlnswzftqpebdi.supabase.co").replace(/\/$/, "");
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // next/script (gtag, Meta Pixel) e os scripts inline do Next exigem 'unsafe-inline' sem nonce.
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${supabase} https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com https://i.ytimg.com https://img.youtube.com`,
      "font-src 'self' data:",
      `connect-src 'self' ${supabase} https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://www.facebook.com https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
      `media-src 'self' blob: ${supabase}`,
      "worker-src 'self' blob:",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
  // As guias (/guias/*) foram retiradas do site: tinham informação errada e
  // desatualizada e não foram aprovadas. Links antigos (Google, compartilhados)
  // caem numa página válida em vez de 404.
  async redirects() {
    return [
      { source: "/guias/mdf-manaus", destination: "/tecnologia", permanent: true },
      { source: "/guias/:slug*", destination: "/produtos", permanent: true },
      // O catálogo do PFB saiu de /produtos (agora a vitrine das linhas) para
      // /produtos/pfb. QR Codes já impressos e links compartilhados apontam
      // para /produtos?modelo=orb-003: a query segue junto e abre o modelo.
      { source: "/produtos", has: [{ type: "query", key: "modelo" }], destination: "/produtos/pfb", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // Navegações viram transições do <ViewTransition> do React (a página
    // antiga se dissolve, a nova sobe; ver components/movimento/TransicaoPagina).
    viewTransition: true,
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

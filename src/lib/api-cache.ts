/**
 * Cabeçalhos de cache das APIs públicas.
 *
 * Por que existe: as rotas públicas saíam com `max-age=0, must-revalidate`, o
 * que impede a edge da Vercel de guardar qualquer coisa. Toda visita invocava a
 * função e trazia a resposta inteira da origem — 40 KB por visita só no
 * /api/products. Isso é exatamente o que a Vercel cobra como Fast Origin
 * Transfer, e o plano gratuito (10 GB) foi consumido.
 *
 * `s-maxage` só afeta cache compartilhado (a edge), não o navegador, então o
 * conteúdo continua atualizando para quem recarrega. `stale-while-revalidate`
 * deixa a edge servir a cópia antiga enquanto busca a nova em segundo plano —
 * o visitante nunca espera pela revalidação.
 *
 * REGRA: só use em resposta que é igual para todo mundo. Qualquer rota que mude
 * conforme sessão, cookie ou permissão tem que usar SEM_CACHE, senão a edge
 * entrega a resposta de um visitante para outro.
 */

/**
 * Catálogo e estoque. Janela curta porque a resposta carrega `available`, e
 * mostrar placa disponível que já acabou gera promessa que não se cumpre.
 * Pior caso: 60 s servindo do cache + até 120 s de revalidação em segundo
 * plano.
 */
export const CACHE_CATALOGO = "public, s-maxage=60, stale-while-revalidate=120";

/**
 * Conteúdo editorial (fotos e renders de projetos). Muda quando alguém publica
 * um projeto novo, não de minuto a minuto — aparecer 5 min depois é aceitável.
 */
export const CACHE_CONTEUDO = "public, s-maxage=300, stale-while-revalidate=3600";

/** Resposta que depende de quem perguntou. Nunca pode ser compartilhada. */
export const SEM_CACHE = "private, no-store";

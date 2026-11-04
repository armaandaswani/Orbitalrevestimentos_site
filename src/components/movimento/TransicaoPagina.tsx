"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/** Áreas restritas (mesma lista do porteiro da intro): navegam sem transição. */
const AREA_RESTRITA = /^\/(admin|parceiro|representante|o)(\/|$)/;

/**
 * Classes de view transition por tipo (globals.css). O tipo "voltar" vem dos
 * links que levam de volta, `<Link transitionTypes={["voltar"]}>` (ex.: o
 * "← Projetos e parceiros" da página de um showroom), e inverte o sentido.
 */
const ENTRADA = { voltar: "mv-entra-volta", default: "mv-entra" };
const SAIDA = { voltar: "mv-sai-volta", default: "mv-sai" };

/**
 * Transição entre páginas: a página antiga se dissolve subindo, a nova chega
 * subindo devagar (classes mv-sai / mv-entra em globals.css).
 *
 * O <ViewTransition> leva a chave do caminho: ele precisa sair e entrar a cada
 * troca de página para disparar exit/enter (um limite que só muda por dentro
 * seria "update", e o update fica desligado com default="none"). Por isso as
 * mudanças só de query (?modelo=, ?projeto=) não animam, e as áreas restritas
 * dividem uma chave só: o painel não remonta nem anima entre as telas dele.
 * Atenção: se `cacheComponents` for ligado no next.config, a chave por
 * caminho descarta o estado das rotas que o Next guarda em <Activity>.
 *
 * Voltar: links marcados com o tipo "voltar" invertem o sentido. O voltar do
 * navegador não anima: o React aplica a primeira transição de um popstate de
 * forma síncrona (para o navegador restaurar a rolagem no lugar certo), e
 * transição síncrona não abre view transition; a página troca na hora.
 */
export default function TransicaoPagina({ children }: { children: React.ReactNode }) {
  const caminho = usePathname() ?? "/";
  const chave = AREA_RESTRITA.test(caminho) ? "restrita" : caminho;
  return (
    <ViewTransition key={chave} enter={ENTRADA} exit={SAIDA} default="none">
      {children}
    </ViewTransition>
  );
}

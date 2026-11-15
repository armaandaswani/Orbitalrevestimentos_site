"use client";

import { comRep } from "@/lib/parcerias-link";
import { useRepDaUrl } from "./useRepDaUrl";
import Image from "next/image";
import Link from "next/link";

export interface CartaoParceria {
  nome: string;
  frase: string;
  href: string;
  imagem: string;
  alt: string;
  foco?: string;
}

/**
 * Os cartões da porta de entrada de /parcerias: um por perfil, com foto. Quem
 * chega pelo link do representante (`/parcerias?rep=CÓDIGO`) leva o código
 * para a página de perfil que escolher, onde o cadastro o aplica.
 */
export default function CartoesParceria({ cartoes }: { cartoes: CartaoParceria[] }) {
  const rep = useRepDaUrl();
  const destino = (href: string) => comRep(href, rep);

  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-12 lg:grid-cols-5 lg:gap-4">
      {cartoes.map((c, i) => (
        <li key={c.nome} className="min-w-0">
          <Link href={destino(c.href)} data-teste="cartao-parceria"
            className="group relative block aspect-[3/1] overflow-hidden bg-[#0B1F45] sm:aspect-[4/3] lg:aspect-auto lg:h-[min(26rem,calc(100svh-26rem))] lg:min-h-[17rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F45]">
            <Image src={c.imagem} alt="" fill priority={i < 3} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              style={{ objectPosition: c.foco ?? "50% 50%" }} />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0B1F45] via-[#0B1F45]/45 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-4 lg:p-5">
              <span className="block font-serif text-t3 text-white underline-offset-4 decoration-1 group-hover:underline group-active:underline">{c.nome}</span>
              <span className="mt-1 block text-legenda text-white/85">{c.frase}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

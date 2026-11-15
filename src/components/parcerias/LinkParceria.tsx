"use client";

import Link from "next/link";
import { comRep } from "@/lib/parcerias-link";
import { useRepDaUrl } from "./useRepDaUrl";

/** Link entre as páginas de parceria que leva junto o código do representante (`?rep=`), quando há. */
export default function LinkParceria({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <Link href={comRep(href, useRepDaUrl())} className={className}>{children}</Link>;
}

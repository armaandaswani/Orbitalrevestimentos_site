"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "../../AdminShell";

/**
 * "Novo projeto" não é uma tela: é o instante em que o rascunho passa a existir.
 *
 * Criamos o registro aqui, silenciosamente, e trocamos a URL para /admin/projetos/<id>.
 * É isso que permite subir as fotos antes do primeiro salvamento manual — sem o
 * rascunho, as mídias não teriam a que se vincular.
 */
export default function NovoProjetoPage() {
  const router = useRouter();
  const started = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return; // StrictMode monta duas vezes; não crie dois rascunhos.
    started.current = true;
    (async () => {
      const res = await fetch("/api/admin/projects", { method: "POST" }).catch(() => null);
      if (!res || !res.ok) {
        setErr(res?.status === 401 ? "Sessão expirada. Entre novamente." : "Não foi possível criar o rascunho.");
        return;
      }
      const created = await res.json();
      router.replace(`/admin/projetos/${created.id}`);
    })();
  }, [router]);

  return (
    <AdminShell breadcrumb={[{ label: "Projetos", href: "/admin/projetos" }]} title="Novo projeto">
      {err ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-[var(--font-inter)]">
          {err}{" "}
          <Link href="/admin/projetos" className="underline font-bold">Voltar para a lista</Link>
        </div>
      ) : (
        <p className="text-[#74777f] text-sm font-[var(--font-inter)]">Preparando o rascunho…</p>
      )}
    </AdminShell>
  );
}

import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import ShowroomClient from "./ShowroomClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await supabaseAdmin()
      .from("partner_showrooms")
      .select("name, address, description")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    const s = data as { name?: string; address?: string | null; description?: string | null } | null;
    if (!s?.name) return { title: "Showroom | Orbital Revestimentos" };
    return {
      title: `${s.name} — Showroom parceiro | Orbital Revestimentos`,
      description: s.description
        || `Conheça os ambientes revestidos com PFB Orbital no showroom ${s.name}${s.address ? ` — ${s.address}` : ""}.`,
    };
  } catch {
    return { title: "Showroom | Orbital Revestimentos" };
  }
}

export default async function ShowroomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ShowroomClient slug={slug} />;
}

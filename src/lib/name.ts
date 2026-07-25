// Primeiro nome do cliente para personalizar o orçamento (online + PDF).
// - remove espaços extras; pega o primeiro termo;
// - corrige capitalização quando vem tudo minúsculo ou tudo maiúsculo,
//   preservando acentos (toUpperCase/toLowerCase do JS mantêm acentos);
// - retorna null quando não há nome (o chamador usa o texto padrão).
export function firstName(full?: string | null): string | null {
  const t = (full ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  const first = t.split(" ")[0];
  if (!first) return null;
  if (first === first.toLowerCase() || first === first.toUpperCase()) {
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return first;
}

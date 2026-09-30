import { redirect } from "next/navigation";

export default function ContatoRedirect() {
  // /contato abre a aba "Falar com um consultor" (antes levava ao orçamento
  // instantâneo, que saiu da navegação do cliente).
  redirect("/produtos?contato=1");
}

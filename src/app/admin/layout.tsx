import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orbital Admin",
  robots: { index: false, follow: false },
};

// Pass-through on purpose: the admin shell (sidebar/header) lives inside
// page.tsx itself, and this segment also contains the bare printable
// documento page (/admin/pedidos/[id]/documento) which must NOT be wrapped
// in any shell. The public Navbar/Footer/ChatWidget are removed for the whole
// /admin subtree by SiteChrome in the ROOT layout (a nested layout cannot
// remove chrome rendered by its parent).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

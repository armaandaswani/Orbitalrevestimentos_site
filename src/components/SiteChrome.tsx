"use client";

import { usePathname } from "next/navigation";

// Hides the public site's chrome (Navbar/Footer/ChatWidget) on /admin routes.
// A nested /admin/layout.tsx CANNOT do this — nested layouts render INSIDE the
// root layout, which hard-renders the chrome — so the gate has to live at the
// root, keyed on the pathname. Children are passed through untouched everywhere
// else, so server components (Footer) stay server-rendered for public pages.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}

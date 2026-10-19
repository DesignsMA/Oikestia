"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function HeaderShell({ children }: { children: ReactNode }) {
  const [conScroll, setConScroll] = useState(false);

  useEffect(() => {
    const alDesplazar = () => setConScroll(window.scrollY > 8);
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  return (
    <header className={conScroll ? "homepage-header header-scrolled" : "homepage-header"}>
      {children}
    </header>
  );
}

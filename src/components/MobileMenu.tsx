"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconGlyph } from "./IconGlyph";

// The library's own "lines" and "x" icons, inlined so the menu never depends on the database.
const LINES = "0000000000000000000000001111111000000000000000000000000001111111000000000000000000000000001111111000000000000000000000000";
const CLOSE = "0000000000000000000000001000001000001000100000001010000000001000000000101000000010001000001000001000000000000000000000000";

/** Burger menu for small screens: the header's links, stacked in a panel under it. */
export function MobileMenu({
  links,
  cta,
}: {
  links: { href: string; label: string }[];
  /** Main action, shown as a button at the bottom of the panel. */
  cta?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigating, and on Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        className="btn-icon ml-1 size-9"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <IconGlyph pixels={open ? CLOSE : LINES} style="liquid-blob" size={22} />
      </button>
      {open && (
        <nav
          id="mobile-menu"
          className="absolute inset-x-0 top-full flex flex-col border-b border-border bg-background px-4 py-2 shadow-lg"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === l.href ? "page" : undefined}
              className={`border-b border-border py-3 font-display text-2xl last:border-b-0 ${
                pathname === l.href ? "text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {cta && (
            <Link href={cta.href} onClick={() => setOpen(false)} className="btn-fun btn-fun-primary my-3 w-full">
              {cta.label}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

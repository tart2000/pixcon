"use client";

import { useEffect, useRef } from "react";

/** How often an icon of the hero changes, in ms. */
const EVERY = 700;

/**
 * Brings the hero's wall to life, like the bundle's: now and then one icon turns into another glyph with a pop.
 * The wall is a single server-rendered SVG that React never re-renders, so this swaps the <use> href directly
 * instead of re-rendering its thousand cells. Only icons that show (inside the hero, outside its faded middle) change.
 */
export function HeroShuffle({ glyphs }: { glyphs: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wall = ref.current?.parentElement;
    if (!wall) return;
    const cells = [...wall.querySelectorAll<SVGUseElement>("use.hero-glyph")];

    const id = setInterval(() => {
      const box = wall.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      // The fade's ellipse (see .hero-fade): icons well outside it are fully visible.
      const mobile = window.innerWidth <= 640;
      const [rx, ry] = mobile ? [0.95, 0.42] : [0.45, 0.62];
      const visible = (c: SVGUseElement) => {
        const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2 - box.left;
        const y = r.top + r.height / 2 - box.top;
        if (x < 0 || y < 0 || x > box.width || y > box.height) return false;
        const dx = (x - box.width / 2) / (box.width * rx);
        const dy = (y - box.height / 2) / (box.height * ry);
        return Math.hypot(dx, dy) > 0.85;
      };
      // A few random tries are enough: most cells are visible ones.
      for (let tries = 0; tries < 20; tries++) {
        const cell = cells[Math.floor(Math.random() * cells.length)];
        if (!visible(cell)) continue;
        const current = Number(cell.getAttribute("href")?.split("-").pop());
        const next = (current + 1 + Math.floor(Math.random() * (glyphs - 1))) % glyphs;
        cell.setAttribute("href", `#hero-glyph-${next}`);
        // Replay the pop: drop the class, force a style pass, add it back.
        cell.classList.remove("wall-pop");
        void cell.getBoundingClientRect();
        cell.classList.add("wall-pop");
        break;
      }
    }, EVERY);
    return () => clearInterval(id);
  }, [glyphs]);

  return <span ref={ref} hidden />;
}

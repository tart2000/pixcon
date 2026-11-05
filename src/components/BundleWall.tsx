"use client";

import { useEffect, useState } from "react";
import { STYLES, type StyleId } from "@/lib/svg";
import { IconGlyph } from "./IconGlyph";

type Drawing = { name: string; pixels: string; fill: string | null };
type Tile = { drawing: number; style: StyleId; fill: boolean; turn: number };

/** How often a tile changes, in ms. */
const EVERY = 1000;

/** First tiles, the same on the server and in the browser: drawings spread over the sample, each in the next style. */
const firstTiles = (count: number, drawings: number): Tile[] =>
  Array.from({ length: Math.min(count, drawings) }, (_, n) => ({
    drawing: Math.floor((n * drawings) / count),
    style: STYLES[n % STYLES.length].id,
    fill: n % 3 === 1,
    turn: 0,
  }));

/**
 * The bundle page's wall of icons: every second, one tile at random turns into another icon, in another style and
 * variant, with a little pop. Starts from the same tiles as the server's render; holds still for reduced motion.
 */
export function BundleWall({
  drawings,
  count,
  className = "grid grid-cols-5 overflow-hidden rounded-xl border border-border bg-background sm:grid-cols-9",
  tileClassName = "flex aspect-square items-center justify-center shadow-[1px_1px_0_0_var(--border)]",
  size = 40,
}: {
  drawings: Drawing[];
  /** How many tiles. */
  count: number;
  /** The grid; the default is the bundle page's white panel. */
  className?: string;
  tileClassName?: string;
  size?: number;
}) {
  const [tiles, setTiles] = useState(() => firstTiles(count, drawings.length));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = -1;
    const id = setInterval(() => {
      setTiles((current) => {
        // Never the same tile twice in a row, so the change is always somewhere new.
        let n = Math.floor(Math.random() * current.length);
        if (n === last) n = (n + 1) % current.length;
        last = n;
        const next = [...current];
        next[n] = {
          drawing: Math.floor(Math.random() * drawings.length),
          style: STYLES[Math.floor(Math.random() * STYLES.length)].id,
          fill: Math.random() < 0.35,
          turn: current[n].turn + 1,
        };
        return next;
      });
    }, EVERY);
    return () => clearInterval(id);
  }, [drawings.length]);

  return (
    <div aria-hidden className={className}>
      {tiles.map((t, n) => {
        const d = drawings[t.drawing];
        return (
          <div key={n} title={d.name} className={tileClassName}>
            {/* A new key on each change replays the pop. */}
            <div key={t.turn} className={t.turn ? "wall-pop" : undefined}>
              <IconGlyph pixels={(t.fill && d.fill) || d.pixels} style={t.style} size={size} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

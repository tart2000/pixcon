"use client";

import { useEffect, useRef, useState } from "react";
import { setIconColor, useIconColor } from "@/lib/iconColor";
import { PALETTE, findSwatch } from "@/lib/palette";

/** Swatch button opening the base palette. The picked colour themes icons and the whole UI. */
export function ColorPicker({ align = "right" }: { align?: "left" | "right" }) {
  const color = useIconColor();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="btn gap-2 px-2.5"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Colour"
      >
        <Dot main={color} />
        <span className="font-mono text-xs font-normal text-muted">{findSwatch(color)?.name ?? "Auto"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Colour"
          className={`absolute top-full z-20 mt-2 w-60 rounded-lg border border-border bg-background p-3 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="grid grid-cols-6 gap-1.5">
            <SwatchButton main={null} active={color === null} onPick={setIconColor} />
            {PALETTE.map((s) => (
              <SwatchButton key={s.main} main={s.main} active={color === s.main} onPick={setIconColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Round preview of a colour; null shows the default theme colour. */
const Dot = ({ main }: { main: string | null }) => (
  <span
    className="size-4 shrink-0 rounded-full border border-border-strong"
    style={{ background: main ?? "var(--foreground)" }}
  />
);

/** Main colour with its secondary in the bottom-right corner; null = default theme. */
function SwatchButton({
  main,
  active,
  onPick,
}: {
  main: string | null;
  active: boolean;
  onPick: (c: string | null) => void;
}) {
  const swatch = findSwatch(main);
  return (
    <button
      onClick={() => onPick(main)}
      title={swatch ? `${swatch.name} · ${swatch.main} / ${swatch.secondary}` : "Auto (default theme)"}
      aria-pressed={active}
      className={`aspect-square w-full overflow-hidden rounded-md border transition-transform hover:scale-110 ${
        active ? "border-foreground ring-2 ring-foreground/20" : "border-border-strong"
      }`}
      style={{
        background: swatch
          ? `linear-gradient(135deg, ${swatch.main} 55%, ${swatch.secondary} 55%)`
          : "linear-gradient(135deg, #171717 55%, #ffffff 55%)",
      }}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { STYLES, type StyleId } from "@/lib/svg";
import { StyleGlyph } from "./StyleGlyph";

/** Style dropdown: each option shows a small sample drawn in that style. */
export function StyleSelect({ value, onChange }: { value: StyleId; onChange: (s: StyleId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STYLES.find((s) => s.id === value)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    // Escape closes the list only, not a popup it sits in.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative w-fit">
      <button
        className="btn h-9 min-w-40 justify-between gap-3 px-3"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Style: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2.5">
          <StyleGlyph style={value} />
          {current.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-muted" aria-hidden>
          <path d="M1 3h8L5 8z" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Style"
          className="absolute top-full left-0 z-30 mt-1 flex min-w-full flex-col rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          {STYLES.map((s) => (
            <li key={s.id} role="option" aria-selected={s.id === value}>
              <button
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className={`flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm whitespace-nowrap transition-colors ${
                  s.id === value ? "bg-subtle font-medium text-foreground" : "text-muted hover:bg-subtle hover:text-foreground"
                }`}
              >
                <StyleGlyph style={s.id} />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

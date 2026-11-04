"use client";

import { useEffect, useRef, useState } from "react";
import { STYLES, type StyleId } from "@/lib/svg";
import { StyleGlyph } from "./StyleGlyph";

/** Gap between the button and the list, and the room kept free at the viewport's edge. */
const GAP = 4;
const MARGIN = 8;

/**
 * Style dropdown: each option shows a small sample drawn in that style. The list is fixed
 * to the viewport, so it spills out of a popup or a scrolling panel instead of being cut.
 */
export function StyleSelect({ value, onChange }: { value: StyleId; onChange: (s: StyleId) => void }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = STYLES.find((s) => s.id === value)!;

  const toggle = () => {
    if (open) return setOpen(false);
    // Below the button, or above it when there is more room there; scrolls if neither fits.
    const r = ref.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - MARGIN;
    const above = r.top - GAP - MARGIN;
    const up = below < 400 && above > below;
    setPlace({
      left: r.left,
      minWidth: r.width,
      maxHeight: up ? above : below,
      ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // A fixed list would drift from its button: close it when anything else scrolls or resizes.
    const onMove = (e: Event) => e.target !== listRef.current && setOpen(false);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
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
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
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
        onClick={toggle}
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
          ref={listRef}
          role="listbox"
          aria-label="Style"
          style={place}
          className="fixed z-50 flex flex-col overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg"
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

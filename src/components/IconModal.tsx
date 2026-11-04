"use client";

import { useEffect, useRef } from "react";
import type { Variant } from "@/lib/pixels";
import type { StyleId } from "@/lib/svg";
import { IconDetails, type DetailsItem } from "./IconDetails";
import { ChevronIcon, CloseIcon } from "./UiIcons";

/** The gallery's popup: an icon's details, with arrows to browse the list it was opened from. */
export function IconModal({
  icons,
  index,
  onIndex,
  onClose,
  onTag,
  ...details
}: {
  icons: DetailsItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Search the library for a tag. */
  onTag: (tag: string) => void;
  variant: Variant;
  setVariant: (v: Variant) => void;
  style: StyleId;
  setStyle: (s: StyleId) => void;
  grid: boolean;
  setGrid: (g: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const icon = icons[index];

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const step = (delta: number) => onIndex((index + delta + icons.length) % icons.length);

  return (
    <dialog
      ref={ref}
      aria-label={icon.name}
      // Escape closes the dialog natively; keep React in charge of whether it's shown.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      }}
      className="m-auto w-[min(56rem,calc(100%-2rem))] max-h-[calc(100%-2rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-4 sm:p-6">
        <IconDetails
          {...details}
          icon={icon}
          onTag={onTag}
          nav={
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button className="btn-icon" title="Previous (←)" onClick={() => step(-1)} disabled={icons.length < 2}>
                <ChevronIcon dir="left" />
              </button>
              <span className="font-mono text-xs text-muted">
                {index + 1}/{icons.length}
              </span>
              <button className="btn-icon" title="Next (→)" onClick={() => step(1)} disabled={icons.length < 2}>
                <ChevronIcon dir="right" />
              </button>
              <button className="btn-icon ml-1" title="Close (Esc)" onClick={onClose}>
                <CloseIcon />
              </button>
            </div>
          }
        />
      </div>
    </dialog>
  );
}

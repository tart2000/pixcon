"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Variant } from "@/lib/pixels";
import { useIconColor } from "@/lib/iconColor";
import { iconUrl } from "@/lib/paths";
import { DEFAULT_STYLE, STYLES, type StyleId } from "@/lib/svg";
import { IconDetails, type DetailsItem } from "./IconDetails";
import { IconGlyph } from "./IconGlyph";
import { ChevronIcon } from "./UiIcons";

/** An icon's own page: the popup's details, then icons sharing its tags, shown the same way. */
export function IconPage({ icon, related }: { icon: DetailsItem; related: DetailsItem[] }) {
  const [style, setStyle] = useState<StyleId>(DEFAULT_STYLE);
  const [variant, setVariant] = useState<Variant>("regular");
  const [grid, setGrid] = useState(false);
  const color = useIconColor();
  const track = useRef<HTMLUListElement>(null);
  /** Slide the related icons by most of a screenful. */
  const slide = (dir: 1 | -1) => {
    const t = track.current;
    if (t) t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12">
      <div className="flex flex-col gap-4">
        <Link href="/icons" className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground">
          <ChevronIcon dir="left" />
          All icons
        </Link>
        <IconDetails
          icon={icon}
          heading
          variant={variant}
          setVariant={setVariant}
          style={style}
          setStyle={setStyle}
          grid={grid}
          setGrid={setGrid}
        />
        <p className="text-sm text-muted">
          A free {icon.name} pixel icon, drawn on an 11×11 grid. Pick one of {STYLES.length} styles, regular or fill,
          and any colour, then paste the HTML or download it as SVG or PNG.
        </p>
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Related icons</h2>
            <div className="flex gap-1">
              <button className="btn-icon" title="Previous" aria-label="Previous icons" onClick={() => slide(-1)}>
                <ChevronIcon dir="left" />
              </button>
              <button className="btn-icon" title="Next" aria-label="Next icons" onClick={() => slide(1)}>
                <ChevronIcon dir="right" />
              </button>
            </div>
          </div>
          {/* One row that slides, so a short list never leaves a gap in a grid. */}
          <ul
            ref={track}
            className="no-scrollbar flex snap-x snap-mandatory divide-x divide-border overflow-x-auto rounded-lg border border-border bg-background"
          >
            {related.map((i) => (
              <li key={i.id} className="w-36 shrink-0 snap-start">
                <Link
                  href={iconUrl(i.name)}
                  className="flex flex-col items-center gap-3 px-3 pt-6 pb-4 transition-colors hover:bg-subtle"
                >
                  <IconGlyph
                    pixels={(variant === "fill" ? i.fill : null) ?? i.pixels}
                    style={style}
                    size={56}
                    color={color}
                    grid={grid}
                  />
                  <span className="w-full truncate text-center font-mono text-xs text-muted">{i.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { VARIANTS, type Variant } from "@/lib/pixels";
import { STYLES, type StyleId } from "@/lib/svg";
import { ColorPicker } from "../ColorPicker";
import { IconGlyph } from "../IconGlyph";
import { Segmented } from "../Segmented";

type Item = { name: string; pixels: string; fill: string | null };

/** A taste of the library: a few icons with live variant/style switches, each opening in /icons. */
export function LibraryPreview({ icons, total }: { icons: Item[]; total: number }) {
  const [style, setStyle] = useState<StyleId>("liquid-blob");
  const [variant, setVariant] = useState<Variant>("regular");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <Segmented label="Style" options={STYLES} value={style} onChange={setStyle} />
        {/* The picked colour themes the whole site, these icons included. */}
        <div className="sm:ml-auto">
          <ColorPicker />
        </div>
      </div>
      <ul className="grid grid-cols-4 overflow-hidden rounded-lg border border-border sm:grid-cols-6 lg:grid-cols-8">
        {icons.map((i) => (
          <li key={i.name} className="shadow-[1px_1px_0_0_var(--border)]">
            <Link
              href={`/icons?icon=${encodeURIComponent(i.name)}`}
              title={i.name}
              className="flex aspect-square items-center justify-center transition-colors hover:bg-subtle"
            >
              <IconGlyph pixels={(variant === "fill" && i.fill) || i.pixels} style={style} size={36} />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/icons" className="self-end text-sm font-medium underline-offset-4 hover:underline">
        Browse all {total} icons →
      </Link>
    </div>
  );
}

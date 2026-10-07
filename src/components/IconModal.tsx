"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VARIANTS, decode, type Variant } from "@/lib/pixels";
import { STYLES, downloadFile, iconSvg, slugify, type StyleId } from "@/lib/svg";
import { useIconColor } from "@/lib/iconColor";
import { canEdit } from "@/lib/editing";
import { kitTag } from "@/lib/kit";
import { recordView } from "@/app/actions";
import { ColorPicker } from "./ColorPicker";
import { IconGlyph } from "./IconGlyph";
import { Segmented } from "./Segmented";
import { CheckIcon, ChevronIcon, CloseIcon, CopyIcon, DownloadIcon, LinkIcon } from "./UiIcons";

type Item = { id: number; name: string; alts: string[]; pixels: string; fill: string | null };

/** Icon details popup: big preview, variant/style/colour, SVG code to copy or download. */
export function IconModal({
  icons,
  index,
  onIndex,
  onClose,
  onTag,
  variant,
  setVariant,
  style,
  setStyle,
}: {
  icons: Item[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Search the library for a tag. */
  onTag: (tag: string) => void;
  variant: Variant;
  setVariant: (v: Variant) => void;
  style: StyleId;
  setStyle: (s: StyleId) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<"name" | "link" | "code" | null>(null);
  const [format, setFormat] = useState<"html" | "svg">("html");
  const color = useIconColor();
  const icon = icons[index];
  const pixels = variant === "fill" ? (icon.fill ?? icon.pixels) : icon.pixels;
  const svg = iconSvg(decode(pixels), style, { color: color ?? undefined });
  const code = format === "html" ? kitTag(icon.name, style, variant) : svg;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // One view per icon shown, arrows included. The ref keeps dev's double-run effects from counting twice.
  const counted = useRef<number | null>(null);
  useEffect(() => {
    if (counted.current === icon.id) return;
    counted.current = icon.id;
    recordView(icon.id).catch(() => {});
  }, [icon.id]);

  const step = (delta: number) => onIndex((index + delta + icons.length) % icons.length);

  const copy = async (what: "name" | "link" | "code", text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied((c) => (c === what ? null : c)), 1200);
  };

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
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <header className="flex items-center gap-2">
          <button
            className="truncate rounded-md px-2 py-1 font-mono text-xl font-semibold tracking-tight hover:bg-subtle sm:text-2xl"
            title="Copy icon name"
            onClick={() => copy("name", icon.name)}
          >
            {icon.name}
          </button>
          <button className="btn-icon shrink-0" title="Copy link" onClick={() => copy("link", window.location.href)}>
            {copied === "link" ? <CheckIcon /> : <LinkIcon />}
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {copied === "name" && "Name copied"}
          </span>
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
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col rounded-lg border border-border">
            <div className="flex flex-1 items-center justify-center py-10">
              <IconGlyph pixels={pixels} style={style} size={176} color={color} />
            </div>
            <div className="flex items-end justify-center gap-5 border-t border-border py-4">
              {[16, 24, 32, 48].map((size) => (
                <IconGlyph key={size} pixels={pixels} style={style} size={size} color={color} />
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Variant" options={VARIANTS} value={variant} onChange={setVariant} />
              <ColorPicker />
            </div>
            <Segmented label="Style" options={STYLES} value={style} onChange={setStyle} />
            <div className="flex flex-col gap-2">
              <Segmented
                label="Code"
                options={[
                  { id: "html", label: "HTML" },
                  { id: "svg", label: "SVG" },
                ]}
                value={format}
                onChange={setFormat}
              />
              <pre className="max-h-48 overflow-auto rounded-lg bg-foreground p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-on-foreground">
                {code}
              </pre>
              {format === "html" && (
                <p className="text-xs text-muted">
                  Needs the Pixcon kit on the page,{" "}
                  <Link href="/how-to" className="text-foreground underline underline-offset-2">
                    see How to
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => copy("code", code)}>
                {copied === "code" ? <CheckIcon /> : <CopyIcon />}
                {copied === "code" ? "Copied" : format === "html" ? "Copy HTML" : "Copy SVG"}
              </button>
              <button
                className="btn flex-1"
                onClick={() => downloadFile(`${slugify(icon.name)}-${variant}-${style}.svg`, svg)}
              >
                <DownloadIcon />
                Download SVG
              </button>
            </div>
          </div>
        </div>

        {(icon.alts.length > 0 || canEdit) && (
          <footer className="flex flex-wrap items-center gap-1.5">
            {icon.alts.map((a) => (
              <button
                key={a}
                onClick={() => onTag(a)}
                title={`Show icons tagged “${a}”`}
                className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-muted transition-colors hover:border-border-strong hover:bg-subtle hover:text-foreground"
              >
                {a}
              </button>
            ))}
            {canEdit && (
              <Link
                href={`/icons/${icon.id}${variant === "fill" ? "?variant=fill" : ""}`}
                className="btn ml-auto h-8"
              >
                Edit
              </Link>
            )}
          </footer>
        )}
      </div>
    </dialog>
  );
}

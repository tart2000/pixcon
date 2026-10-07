"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createIcon, deleteIcon, duplicateIcon, isNameTaken, updateIcon } from "@/app/actions";
import {
  GRID,
  VARIANTS,
  decode,
  emptyGrid,
  encode,
  flipH,
  flipV,
  rotate,
  invert,
  shift,
  type Grid,
  type Variant,
} from "@/lib/pixels";
import { STYLES, VIEWBOX, downloadFile, iconPath, iconSvg, slugify, type StyleId } from "@/lib/svg";
import { useIconColor } from "@/lib/iconColor";
import { ColorPicker } from "./ColorPicker";
import { IconGlyph } from "./IconGlyph";
import { Segmented } from "./Segmented";
import { Menu, MenuItem } from "./Menu";
import { importPhosphor } from "@/lib/phosphor";
import { toSlug, typingSlug } from "@/lib/slug";
import { reservedReason } from "@/lib/reserved";
import { AltsInput } from "./AltsInput";
import { STATUSES, type Status } from "@/lib/status";

type Grids = Record<Variant, Grid>;
type Props = {
  icon?: { id: number; name: string; alts: string[]; pixels: string; fill: string | null; status: Status };
  initialVariant?: Variant;
  /** Alts already used across icons, offered while typing. */
  knownAlts?: string[];
  /** Rank among validated icons (oldest first); absent for icons that aren't validated. */
  position?: { index: number; total: number } | null;
};

const EMPTY = encode(emptyGrid());
/** What gets stored: an empty fill variant is saved as null. */
const serialize = (gs: Grids) => ({ pixels: encode(gs.regular), fill: gs.fill.some(Boolean) ? encode(gs.fill) : null });

export function Editor({ icon, initialVariant = "regular", knownAlts, position }: Props) {
  const router = useRouter();
  // Undo history covers both variants together.
  const [hist, setHist] = useState<{ grids: Grids; past: Grids[]; future: Grids[] }>(() => {
    const regular = icon ? decode(icon.pixels) : emptyGrid();
    // Opening straight on an empty fill starts it from the regular drawing (see `switchVariant`).
    const fill = icon?.fill ? decode(icon.fill) : initialVariant === "fill" ? regular : emptyGrid();
    return { grids: { regular, fill }, past: [], future: [] };
  });
  const { grids, past, future } = hist;
  const [variant, setVariant] = useState<Variant>(initialVariant);
  /** Switching to an empty fill starts it from the regular drawing, as one undoable step. */
  const switchVariant = (v: Variant) => {
    setVariant(v);
    if (v !== "fill") return;
    setHist((h) =>
      h.grids.fill.some(Boolean) || !h.grids.regular.some(Boolean)
        ? h
        : { grids: { ...h.grids, fill: h.grids.regular }, past: [...h.past.slice(-99), h.grids], future: [] },
    );
  };
  const grid = grids[variant];
  const [name, setName] = useState(icon?.name ?? "");
  const [alts, setAlts] = useState<string[]>(icon?.alts ?? []);
  const [saved, setSaved] = useState({
    name: icon?.name ?? "",
    alts: (icon?.alts ?? []).join(","),
    pixels: icon?.pixels ?? EMPTY,
    fill: icon?.fill ?? null,
    status: icon?.status ?? ("wip" as Status),
  });
  const [style, setStyle] = useState<StyleId>("pixel");
  const color = useIconColor();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = serialize(grids);
  // A requested icon becomes WIP as soon as someone draws it.
  const nextStatus = saved.status === "requested" && current.pixels !== EMPTY ? "wip" : saved.status;
  const dirty =
    name !== saved.name ||
    alts.join(",") !== saved.alts ||
    current.pixels !== saved.pixels ||
    current.fill !== saved.fill ||
    nextStatus !== saved.status;
  const count = grid.filter(Boolean).length;

  // Names are unique slugs: check availability while typing so a clash shows before saving.
  const slug = toSlug(name);
  const [takenSlug, setTakenSlug] = useState<string | null>(null);
  useEffect(() => {
    if (!slug || slug === saved.name) return;
    let live = true;
    const t = setTimeout(async () => {
      const taken = await isNameTaken(slug, icon?.id);
      if (live) setTakenSlug(taken ? slug : null);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [slug, saved.name, icon?.id]);
  const nameTaken = !!slug && slug !== saved.name && takenSlug === slug;
  const nameReserved = slug ? reservedReason(slug) : null;
  const nameOk = !!slug && !nameTaken && !nameReserved;

  /** Apply a change to the active variant as one undoable step. `from` is the state to restore on undo. */
  const commit = useCallback(
    (next: Grid | ((g: Grid) => Grid), from?: Grids) => {
      setHist((h) => {
        const n = typeof next === "function" ? next(h.grids[variant]) : next;
        const grids = { ...h.grids, [variant]: n };
        const prev = from ?? h.grids;
        if (encode(grids.regular) === encode(prev.regular) && encode(grids.fill) === encode(prev.fill))
          return { ...h, grids };
        return { grids, past: [...h.past.slice(-99), prev], future: [] };
      });
    },
    [variant],
  );

  const undo = useCallback(
    () =>
      setHist((h) =>
        h.past.length
          ? { grids: h.past[h.past.length - 1], past: h.past.slice(0, -1), future: [h.grids, ...h.future] }
          : h,
      ),
    [],
  );

  const redo = useCallback(
    () =>
      setHist((h) =>
        h.future.length ? { grids: h.future[0], past: [...h.past, h.grids], future: h.future.slice(1) } : h,
      ),
    [],
  );

  // ---- Drawing ----
  const boardRef = useRef<HTMLDivElement>(null);
  const stroke = useRef<{ value: boolean; start: Grids; last: number } | null>(null);

  const cellAt = (e: React.PointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * GRID);
    const y = Math.floor(((e.clientY - r.top) / r.height) * GRID);
    return x >= 0 && x < GRID && y >= 0 && y < GRID ? y * GRID + x : -1;
  };

  /** Paint cells without recording history; the whole stroke is recorded on pointer up. */
  const paint = (cells: number[], value: boolean) =>
    setHist((h) => {
      if (cells.every((i) => h.grids[variant][i] === value)) return h;
      const g = h.grids[variant].slice();
      for (const i of cells) g[i] = value;
      return { ...h, grids: { ...h.grids, [variant]: g } };
    });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 2) return;
    const i = cellAt(e);
    if (i < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Clicking toggles the pixel (and the rest of the stroke follows); right click erases.
    const value = e.button === 2 ? false : !grid[i];
    stroke.current = { value, start: grids, last: i };
    paint([i], value);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = stroke.current;
    const i = cellAt(e);
    if (!s || i < 0 || i === s.last) return;
    // Fill the cells between the previous and current position so fast moves leave no gaps.
    paint(line(s.last, i), s.value);
    s.last = i;
  };

  const endStroke = () => {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    commit((g) => g, s.start);
  };

  // ---- Persistence ----
  /** Save the current state; `as` overrides the status (used by Validate). */
  const save = (as: Status = nextStatus) => {
    setError(null);
    startTransition(async () => {
      try {
        const { pixels, fill } = current;
        const status = as;
        if (status === "validated" && (pixels === EMPTY || !fill))
          throw new Error("Draw both variants before validating");
        if (icon) {
          await updateIcon(icon.id, name, alts, pixels, fill, status);
          setSaved({ name: toSlug(name), alts: alts.join(","), pixels, fill, status });
          setName(toSlug);
          router.refresh();
        } else {
          const id = await createIcon(name, alts, pixels, fill, status);
          setSaved({ name: toSlug(name), alts: alts.join(","), pixels, fill, status });
          router.push(`/icons/${id}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  const [importing, setImporting] = useState(false);
  /** Approximate the regular Phosphor icon named like this one (or one of its alts). */
  const importFromPhosphor = async () => {
    setError(null);
    setImporting(true);
    try {
      const found = await importPhosphor([name, ...alts], "regular");
      if (found) commit(found.grid);
      else setError(`No Phosphor icon named “${[name, ...alts].filter(Boolean).join("”, “")}”`);
    } catch {
      setError("Couldn't reach Phosphor");
    } finally {
      setImporting(false);
    }
  };

  const duplicate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const id = await duplicateIcon(name || icon?.name || "icon", alts, current.pixels, current.fill);
        router.push(`/icons/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  const remove = () => {
    if (!icon || !confirm(`Delete "${icon.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteIcon(icon.id);
      router.push("/");
    });
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (nameOk && dirty && !pending) save();
      } else if (!mod && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const [dx, dy] = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
          e.key
        ] ?? [0, 0];
        commit((g) => shift(g, dx, dy));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const svg = iconSvg(grid, style, { color: color ?? undefined });
  const center = (GRID - 1) / 2;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      {/* The editor sits on plain white rather than the tinted page background. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-background" />
      {/* Canvas */}
      <section className="flex min-w-0 flex-col gap-3">
        {/* Same width as the board below. */}
        <div className="mx-auto flex w-full max-w-[640px] flex-wrap items-center gap-1 rounded-lg border border-border p-1">
          <Segmented label="Variant" options={VARIANTS} value={variant} onChange={switchVariant} />
          {variant === "regular" && !count && (
            <button
              className="btn ml-1 h-8"
              onClick={importFromPhosphor}
              disabled={!name.trim() || importing}
              title={name.trim() ? `Approximate Phosphor's “${name.trim()}” icon` : "Name the icon first"}
            >
              {importing ? "Importing…" : "Import Phosphor"}
            </button>
          )}
          {/* Fill still a copy of regular: offer the classic way to make it solid. */}
          {variant === "fill" && count > 0 && encode(grids.fill) === encode(grids.regular) && (
            <button className="btn ml-1 h-8" onClick={() => commit(invert)} title="Swap filled and empty pixels">
              Invert
            </button>
          )}
          <Divider />
          <button className="btn-icon" onClick={undo} disabled={!past.length} title="Undo (⌘Z)">
            <UndoIcon />
          </button>
          <button className="btn-icon" onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)">
            <UndoIcon className="-scale-x-100" />
          </button>
          <button className="btn-icon" onClick={() => commit(flipH)} disabled={!count} title="Flip horizontally">
            <FlipIcon />
          </button>
          <button className="btn-icon" onClick={() => commit(flipV)} disabled={!count} title="Flip vertically">
            <FlipIcon className="rotate-90" />
          </button>
          <button className="btn-icon" onClick={() => commit(rotate)} disabled={!count} title="Rotate 90° clockwise">
            <RotateIcon />
          </button>
          <button className="btn-icon" onClick={() => commit(emptyGrid())} disabled={!count} title="Clear">
            <TrashIcon />
          </button>
          {position && (
            <span className="ml-auto pr-2 font-mono text-xs text-muted" title="Number among validated icons">
              {position.index}/{position.total}
            </span>
          )}
        </div>

        <div
          ref={boardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onContextMenu={(e) => e.preventDefault()}
          className="mx-auto aspect-square w-full max-w-[640px] cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-border"
        >
          {/* The canvas is drawn in the selected style, on top of a grid of guides. */}
          <svg viewBox={VIEWBOX} className="block size-full" shapeRendering={style === "pixel" ? "crispEdges" : undefined}>
            <rect width="100%" height="100%" className="fill-background" />
            <rect x={center * 10} width={10} height="100%" className="fill-subtle" />
            <rect y={center * 10} width="100%" height={10} className="fill-subtle" />
            <path d={gridLines} className="stroke-border" strokeWidth={0.15} fill="none" />
            <path d={iconPath(grid, style)} className="fill-foreground" style={color ? { fill: color } : undefined} />
          </svg>
        </div>
        <p className="text-center text-xs text-muted">
          Editing the <span className="text-foreground">{variant}</span> variant · click &amp; drag to draw · right-click to erase · arrow keys to nudge
        </p>
      </section>

      {/* Sidebar */}
      <aside className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            className="input font-mono"
            placeholder="arrow-right"
            value={name}
            maxLength={64}
            onChange={(e) => setName(typingSlug(e.target.value))}
            onBlur={() => setName(toSlug)}
            onKeyDown={(e) => e.key === "Enter" && nameOk && dirty && save()}
            aria-invalid={nameTaken || !!nameReserved}
          />
          {nameTaken && (
            <p className="text-sm text-red-600 dark:text-red-400">“{slug}” is already taken by another icon.</p>
          )}
          {nameReserved && (
            <p className="text-sm text-red-600 dark:text-red-400">
              “{slug}” is reserved ({nameReserved}): the kit reads it as <code>px-{slug}</code>.
            </p>
          )}
          <label htmlFor="alts" className="mt-2 text-sm font-medium">
            Alts <span className="font-normal text-muted">· other names people search for</span>
          </label>
          <AltsInput value={alts} onChange={setAlts} suggestions={knownAlts} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <StatusBadge status={nextStatus} />
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary flex-1" onClick={() => save()} disabled={!nameOk || !dirty || pending}>
              {pending ? "Saving…" : icon ? (dirty ? "Save changes" : "Saved") : "Create icon"}
            </button>
            {icon && (
              <Menu label="More actions" disabled={pending}>
                {saved.status !== "validated" && (
                  <MenuItem
                    onSelect={() => save("validated")}
                    disabled={!nameOk || current.pixels === EMPTY || !current.fill}
                  >
                    Validate
                    <span className="ml-auto text-xs text-muted">
                      {current.pixels === EMPTY ? "needs regular" : !current.fill ? "needs fill" : dirty && "saves changes"}
                    </span>
                  </MenuItem>
                )}
                <MenuItem onSelect={duplicate}>Duplicate</MenuItem>
                <MenuItem onSelect={remove} danger>
                  Delete
                </MenuItem>
              </Menu>
            )}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Style</h2>
            <ColorPicker />
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`flex flex-col items-center gap-2 py-4 transition-colors ${
                  style === s.id ? "bg-subtle" : "bg-background hover:bg-subtle"
                }`}
              >
                <IconGlyph pixels={grid} style={s.id} size={32} color={color} />
                <span className={`text-xs ${style === s.id ? "text-foreground" : "text-muted"}`}>{s.label}</span>
              </button>
            ))}
            {/* Pad the last row so the 1px grid lines don't show through empty slots. */}
            {Array.from({ length: (3 - (STYLES.length % 3)) % 3 }, (_, i) => (
              <div key={i} className="bg-background" />
            ))}
          </div>
          <div className="flex items-end justify-center gap-4 rounded-lg border border-border py-4">
            {[16, 24, 32, 48].map((size) => (
              <IconGlyph key={size} pixels={grid} style={style} size={size} color={color} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">
            Export{" "}
            <span className="font-normal text-muted">
              · {VARIANTS.find((v) => v.id === variant)?.label} · {STYLES.find((s) => s.id === style)?.label}
            </span>
          </h2>
          <div className="flex gap-2">
            <button
              className="btn flex-1"
              onClick={() => downloadFile(`${slugify(name)}-${variant}-${style}.svg`, svg)}
              disabled={!count}
            >
              Download SVG
            </button>
            <button className="btn flex-1" onClick={() => navigator.clipboard.writeText(svg)} disabled={!count}>
              Copy SVG
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Cells on the line between two cell indices (Bresenham). */
const gridLines = Array.from({ length: GRID - 1 }, (_, i) => `M${(i + 1) * 10} 0V${GRID * 10}M0 ${(i + 1) * 10}H${GRID * 10}`).join("");

function line(from: number, to: number): number[] {
  let x0 = from % GRID;
  let y0 = Math.floor(from / GRID);
  const x1 = to % GRID;
  const y1 = Math.floor(to / GRID);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const cells: number[] = [];
  for (;;) {
    cells.push(y0 * GRID + x0);
    if (x0 === x1 && y0 === y1) return cells;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function StatusBadge({ status }: { status: Status }) {
  const s = STATUSES.find((x) => x.id === status)!;
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs">
      <span className={`size-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-border" />;

const ico = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const UndoIcon = ({ className }: { className?: string }) => (
  <svg {...ico} className={className}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);
const RotateIcon = () => (
  <svg {...ico}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);
const FlipIcon = ({ className }: { className?: string }) => (
  <svg {...ico} className={className}>
    <path d="M12 3v18M8 7l-5 5 5 5V7ZM16 7l5 5-5 5V7Z" />
  </svg>
);
const TrashIcon = () => (
  <svg {...ico}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

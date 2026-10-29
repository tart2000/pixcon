"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { VARIANTS, decode, type Variant } from "@/lib/pixels";
import { iconPath, type StyleId } from "@/lib/svg";
import { matchesQuery } from "@/lib/alts";
import { canEdit } from "@/lib/editing";
import {
  INKS,
  PRODUCTS,
  SHIPPING_PRICE,
  VAT,
  findColor,
  findProduct,
  findProductInk,
  inksOf,
  isStyle,
  isVariant,
  priceOf,
  printLayout,
  printUrl,
  withVat,
  type Product,
  type ProductColor,
} from "@/lib/merch/products";
import { startCheckout } from "@/app/shop/actions";
import { IconGlyph } from "../IconGlyph";
import { Segmented } from "../Segmented";
import { StyleSelect } from "../StyleSelect";
import { CloseIcon } from "../UiIcons";

type Item = { name: string; alts: string[]; pixels: string; fill: string | null };
type Initial = Record<"product" | "icon" | "style" | "variant" | "ink" | "color" | "size", string | null>;

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** Product creator: icon, style, variant and ink on one side, the product (colour, size) on the other. */
export function ShopBuilder({ icons, initial }: { icons: Item[]; initial: Initial }) {
  const [product, setProduct] = useState<Product>(() => findProduct(initial.product) ?? PRODUCTS[0]);
  const [iconName, setIconName] = useState(
    () => icons.find((i) => i.name === initial.icon)?.name ?? icons.find((i) => i.name === "heart")?.name ?? icons[0]?.name,
  );
  const [style, setStyle] = useState<StyleId>(isStyle(initial.style) ? initial.style : "liquid-blob");
  const [variant, setVariant] = useState<Variant>(isVariant(initial.variant) ? initial.variant : "regular");
  const [color, setColor] = useState<ProductColor>(
    () => findColor(product, initial.color) ?? findColor(product, product.defaultColor)!,
  );
  // Without an ink in the link, whichever of black and white shows on the product.
  const [ink, setInk] = useState(
    () => (initial.ink && findProductInk(product, `#${initial.ink}`)?.hex) || defaultInk(product, color),
  );
  const [size, setSize] = useState(() => (color.sizes.find((s) => s.size === initial.size) ?? defaultSize(color)).size);

  const icon = icons.find((i) => i.name === iconName);
  // Icons without a fill variant only come in regular.
  const variants = icon?.fill ? VARIANTS : VARIANTS.filter((v) => v.id === "regular");
  const shownVariant = icon?.fill ? variant : "regular";
  const pixels = icon && (shownVariant === "fill" ? icon.fill! : icon.pixels);
  const sized = color.sizes.find((s) => s.size === size) ?? defaultSize(color);
  const price = priceOf(product, sized.cost);
  const [paying, startPaying] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);

  // Stripe takes it from here: the action returns its checkout page, which we open.
  const checkout = () =>
    startPaying(async () => {
      setPayError(null);
      try {
        const url = await startCheckout({
          product: product.slug,
          icon: icon!.name,
          style,
          variant: shownVariant,
          ink,
          color: color.name,
          size: sized.size,
        });
        window.location.assign(url);
      } catch {
        setPayError("Checkout couldn't start. Please try again.");
      }
    });

  /** Switch product, keeping the icon and its style, on that product's default colour. */
  const pickProduct = (p: Product) => {
    const c = findColor(p, p.defaultColor)!;
    setProduct(p);
    setColor(c);
    setSize(defaultSize(c).size);
    // Keep the ink unless the new product can't print it (white on the mug).
    if (!findProductInk(p, ink)) setInk(defaultInk(p, c));
  };

  const pickColor = (c: ProductColor) => {
    setColor(c);
    // Keep the size when the new colour has it.
    if (!c.sizes.some((s) => s.size === size)) setSize(defaultSize(c).size);
  };

  // Mirror the design in the URL so it can be shared or bookmarked.
  useEffect(() => {
    if (!icon) return;
    const params = new URLSearchParams({
      product: product.slug,
      icon: icon.name,
      style,
      variant: shownVariant,
      ink: ink.slice(1),
      color: color.name.toLowerCase(),
      size: sized.size,
    });
    window.history.replaceState(null, "", `?${params}`);
  }, [product, icon, style, shownVariant, ink, color, sized]);

  if (!icon || !pixels) return <p className="text-muted">No icons yet.</p>;

  return (
    <div className="flex flex-col gap-8">
      <ProductTabs icons={icons} style={style} value={product} onChange={pickProduct} />
      <div className="grid items-start gap-8 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-3 md:sticky md:top-20">
          {product.slug === "mug" ? (
            <MugPreview product={product} pixels={pixels} style={style} ink={ink} />
          ) : (
            <ProductPreview product={product} color={color} pixels={pixels} style={style} ink={ink} />
          )}
          <p className="text-center text-xs text-muted">
            Preview · {product.design.label}, {product.design.width}″ wide
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Field label="Icon" value={icon.name}>
            <IconPicker icons={icons} value={icon.name} onChange={setIconName} style={style} variant={shownVariant} />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <StyleSelect value={style} onChange={setStyle} />
            <Segmented label="Variant" options={variants} value={shownVariant} onChange={setVariant} />
          </div>

          <Field label="Icon colour" value={findProductInk(product, ink)?.name}>
            <Swatches items={inksOf(product).map((i) => ({ id: i.hex, name: i.name, hex: i.hex }))} value={ink} onChange={setInk} />
          </Field>

          {/* One colour only (the mug): nothing to pick. */}
          {product.catalog.colors.length > 1 && (
            <Field label={product.colorLabel} value={color.name}>
              <Swatches
                items={product.catalog.colors.map((c) => ({ id: c.name, name: c.name, hex: c.hex }))}
                value={color.name}
                onChange={(name) => pickColor(findColor(product, name)!)}
              />
            </Field>
          )}

          {/* One size only (mugs): nothing to pick. */}
          {color.sizes.length > 1 && (
            <Field label="Size" value={sized.size} action={<SizeChart product={product} highlight={sized.size} />}>
              <Segmented
                label="Size"
                options={color.sizes.map((s) => ({ id: s.size, label: s.size }))}
                value={sized.size}
                onChange={setSize}
              />
            </Field>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-semibold">{product.label}</span>
                <span className="text-xs text-muted">{product.description}</span>
              </div>
              <span className="flex flex-col items-end">
                <span className="font-display text-3xl">{euros.format(price)}</span>
                <span className="text-xs text-muted">VAT included</span>
              </span>
            </div>
            <button className="btn-primary h-11" onClick={checkout} disabled={paying}>
              {paying ? "Opening checkout…" : "Checkout"}
            </button>
            {payError && <p className="text-center text-sm text-red-600 dark:text-red-400">{payError}</p>}
            <p className="text-center text-xs text-muted">
              Shipping {euros.format(SHIPPING_PRICE)} to the EU · Printed on demand, delivered in 5–10 business days
            </p>
            {canEdit && (
              // What Printful bills us (VAT included), and what's left once VAT and Printful are paid.
              <p className="text-center font-mono text-xs text-muted">
                Printful {euros.format(withVat(sized.cost))} + {euros.format(withVat(product.catalog.shipping))} shipping ·
                margin {euros.format(price / (1 + VAT) - sized.cost)} excl. VAT (dev only)
              </p>
            )}
            {canEdit && (
              <a
                className="text-center text-xs text-muted underline underline-offset-2 hover:text-foreground"
                href={printUrl({ product: product.slug, icon: icon.name, style, variant: shownVariant, ink })}
                target="_blank"
              >
                Open the print file (dev only)
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The size picked first: the most common one the colour has. */
const defaultSize = (c: ProductColor) =>
  ["M", "L", "S", "XL"].map((size) => c.sizes.find((s) => s.size === size)).find(Boolean) ?? c.sizes[0];

/** Big buttons to switch product, each shown with its own icon (`tshirt`, `mug`) in the picked style. */
function ProductTabs({
  icons,
  style,
  value,
  onChange,
}: {
  icons: Item[];
  style: StyleId;
  value: Product;
  onChange: (p: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md" role="radiogroup" aria-label="Product">
      {PRODUCTS.map((p) => {
        const glyph = icons.find((i) => i.name === p.slug);
        const active = p.slug === value.slug;
        const from = Math.min(...p.catalog.colors.flatMap((c) => c.sizes.map((s) => priceOf(p, s.cost))));
        return (
          <button
            key={p.slug}
            role="radio"
            aria-checked={active}
            aria-label={p.label}
            onClick={() => onChange(p)}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left whitespace-nowrap sm:gap-3 sm:px-4 transition-colors ${
              active ? "border-foreground bg-foreground text-on-foreground" : "border-border hover:border-border-strong"
            }`}
          >
            {glyph && <IconGlyph pixels={glyph.pixels} style={style} size={40} className="shrink-0" />}
            <span className="flex flex-col">
              <span className="font-display text-xl leading-none sm:text-2xl">{p.slug === "mug" ? "Mug" : "T-shirt"}</span>
              <span className={`text-xs ${active ? "text-on-foreground/70" : "text-muted"}`}>from {euros.format(from)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Printful's photo of the blank mug (handle on the left) with the icon of the side facing us. It's
 * multiplied in, so it takes the enamel's shading.
 */
function MugPreview({ product, pixels, style, ink }: { product: Product; pixels: string; style: StyleId; ink: string }) {
  const photo = product.catalog.photo;
  const face = product.photoFace;
  if (!photo || !face) return null;
  const side = product.design.width * face.inch;
  const iconTop = face.y - (product.catalog.printArea.height / 2 - product.design.top) * face.inch;
  const path = iconPath(decode(pixels), style);
  return (
    // The photo is 1000 px square: zoom in a little on the mug.
    <svg viewBox="70 120 860 860" className="aspect-square w-full rounded-lg border border-border bg-[#f3f3f3]" aria-hidden>
      <image href={photo} width={1000} height={1000} />
      <svg
        x={face.x - side / 2}
        y={iconTop}
        width={side}
        height={side}
        viewBox="0 0 110 110"
        fill={ink}
        style={{ mixBlendMode: "multiply" }}
      >
        <path d={path} />
      </svg>
    </svg>
  );
}

/** Black on light colours, white on dark ones (when the product can print white). */
function defaultInk(product: Product, c: ProductColor) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 || !product.whiteInk ? INKS[0].hex : INKS[1].hex;
}

/**
 * The product photo, the way Printful builds its mockups: the shirt colour underneath, the design on
 * the print area, then the photo's shading on top (it's mostly transparent where the fabric is).
 */
function ProductPreview({
  product,
  color,
  pixels,
  style,
  ink,
}: {
  product: Product;
  color: ProductColor;
  pixels: string;
  style: StyleId;
  ink: string;
}) {
  const { template } = product.catalog;
  const { width, height, xs, y, side } = printLayout(product);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg border border-border transition-colors"
      style={{ background: color.hex }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute"
        style={{
          left: pct(template.area.left, template.width),
          top: pct(template.area.top, template.height),
          width: pct(template.area.width, template.width),
          height: pct(template.area.height, template.height),
        }}
        aria-hidden
      >
        {xs.map((x) => (
          <svg key={x} x={x} y={y} width={side} height={side} viewBox="0 0 110 110" fill={ink}>
            <path d={iconPath(decode(pixels), style)} />
          </svg>
        ))}
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static overlay, sized by its box. */}
      <img src={template.image ?? undefined} alt="" className="pointer-events-none absolute inset-0 size-full" />
    </div>
  );
}

function Field({
  label,
  value,
  action,
  children,
}: {
  label: string;
  value?: string;
  /** Shown at the right end of the label row. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-semibold">{label}</span>
        {value && <span className="font-mono text-xs text-muted">{value}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

/** "Size chart" link opening the garment's measurements, the picked size highlighted. */
function SizeChart({ product, highlight }: { product: Product; highlight: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const chart = product.catalog.sizeChart;
  if (!chart) return null;
  const sizes = Object.keys(chart.rows[0].values);
  return (
    <>
      <button
        className="text-xs text-muted underline underline-offset-2 hover:text-foreground"
        onClick={() => ref.current?.showModal()}
      >
        Size chart
      </button>
      <dialog
        ref={ref}
        aria-label="Size chart"
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <header className="flex items-center justify-between gap-2">
            <h2 className="font-display text-3xl">Size chart</h2>
            <button className="btn-icon" title="Close (Esc)" onClick={() => ref.current?.close()}>
              <CloseIcon />
            </button>
          </header>
          <p className="text-sm text-muted">
            Measured flat on the garment, in {chart.unit}. Measurements may vary by up to 5 cm.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-subtle">
                  <th className="px-3 py-2 text-left font-semibold">Size</th>
                  {chart.rows.map((r) => (
                    <th key={r.label} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s} className={`border-b border-border last:border-0 ${s === highlight ? "bg-subtle font-semibold" : ""}`}>
                    <td className="px-3 py-2 font-mono">{s}</td>
                    {chart.rows.map((r) => (
                      <td key={r.label} className="px-3 py-2 text-right font-mono tabular-nums">
                        {r.values[s as keyof typeof r.values]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Round colour buttons; the name shows on hover and next to the field label. */
function Swatches({
  items,
  value,
  onChange,
}: {
  items: { id: string; name: string; hex: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {items.map((s) => (
        <button
          key={s.id}
          role="radio"
          aria-checked={s.id === value}
          aria-label={s.name}
          title={s.name}
          onClick={() => onChange(s.id)}
          className={`size-8 rounded-full border transition-transform hover:scale-110 ${
            s.id === value ? "border-foreground ring-2 ring-foreground/25 ring-offset-2 ring-offset-background" : "border-border-strong"
          }`}
          style={{ background: s.hex }}
        />
      ))}
    </div>
  );
}

/** The chosen icon, opening a searchable grid of every icon to swap it. */
function IconPicker({
  icons,
  value,
  onChange,
  style,
  variant,
}: {
  icons: Item[];
  value: string;
  onChange: (name: string) => void;
  style: StyleId;
  variant: Variant;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => icons.filter((i) => matchesQuery(i, query)), [icons, query]);
  const current = icons.find((i) => i.name === value)!;

  if (!open)
    return (
      <button className="btn h-14 w-full justify-start gap-3 px-3" onClick={() => setOpen(true)}>
        <IconGlyph pixels={variant === "fill" && current.fill ? current.fill : current.pixels} style={style} size={32} />
        <span className="font-mono">{current.name}</span>
        <span className="ml-auto text-xs font-normal text-muted">Change</span>
      </button>
    );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          className="input h-9 flex-1 px-3 text-sm"
          placeholder={`Search ${icons.length} icons…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
        <button className="btn-icon" title="Close" onClick={() => setOpen(false)}>
          <CloseIcon />
        </button>
      </div>
      <ul className="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1 overflow-y-auto">
        {filtered.map((i) => (
          <li key={i.name}>
            <button
              title={i.name}
              onClick={() => {
                onChange(i.name);
                setOpen(false);
                setQuery("");
              }}
              className={`flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 transition-colors hover:bg-subtle ${
                i.name === value ? "bg-subtle" : ""
              }`}
            >
              <IconGlyph pixels={variant === "fill" && i.fill ? i.fill : i.pixels} style={style} size={28} />
              <span className="w-full truncate text-center font-mono text-[10px] text-muted">{i.name}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="col-span-full py-6 text-center text-sm text-muted">No match.</li>}
      </ul>
    </div>
  );
}

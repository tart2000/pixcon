import { decode } from "@/lib/pixels";
import { iconPath, type StyleId } from "@/lib/svg";
import { fromPrice, printLayout, type Product, type ProductColor } from "@/lib/merch/products";
import { IconGlyph } from "../IconGlyph";

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

type Design = { product: Product; color: ProductColor; pixels: string; style: StyleId; ink: string };

/** A product with its design on it, the way it looks in the shop. */
export function ProductPreview({ product, color, pixels, style, ink }: Design) {
  if (product.slug === "mug") return <MugPreview product={product} pixels={pixels} style={style} ink={ink} />;
  if (product.slug === "sticker") return <StickerPreview product={product} pixels={pixels} style={style} ink={ink} />;
  return <ShirtPreview product={product} color={color} pixels={pixels} style={style} ink={ink} />;
}

/** Class of a product tab; it inverts when active, or on hover inside a `group`. */
export const productTabClass = (active: boolean) =>
  `flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center whitespace-nowrap sm:flex-row sm:gap-3 sm:px-4 sm:text-left transition-colors ${
    active ? "border-foreground bg-foreground text-on-foreground" : "border-border hover:border-border-strong"
  }`;

/** A product tab's content: the product's own icon, its name and its lowest price. */
export function ProductTabLabel({
  product,
  pixels,
  style,
  active = false,
}: {
  product: Product;
  pixels: string | undefined;
  style: StyleId;
  active?: boolean;
}) {
  return (
    <>
      {pixels && <IconGlyph pixels={pixels} style={style} size={40} className="shrink-0" />}
      <span className="flex flex-col items-center sm:items-start">
        <span className="font-display text-xl leading-none sm:text-2xl">{product.name}</span>
        <span className={`text-xs ${active ? "text-on-foreground/70" : "text-muted group-hover:text-on-foreground/70"}`}>
          from {euros.format(fromPrice(product))}
        </span>
      </span>
    </>
  );
}

/**
 * The sticker on its own, without its backing sheet: the icon on its white rounded square (what we
 * print), kiss-cut by Printful with a white border around it.
 */
function StickerPreview({ product, pixels, style, ink }: { product: Product; pixels: string; style: StyleId; ink: string }) {
  // In icon units (110 = the icon's 2.5″): our square plus Printful's ⅛″ border.
  const pad = (product.design.backing ?? 0) + 5.5;
  const side = 110 + 2 * pad;
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-subtle p-[12%]">
      {/* Visible overflow: the shadow reaches past the sticker. */}
      <svg viewBox={`${-pad} ${-pad} ${side} ${side}`} className="size-full overflow-visible" aria-hidden>
        <rect
          x={-pad}
          y={-pad}
          width={side}
          height={side}
          rx={pad * 1.6}
          fill="#ffffff"
          style={{ filter: "drop-shadow(0 2px 5px rgb(0 0 0 / 0.16))" }}
        />
        <path d={iconPath(decode(pixels), style)} fill={ink} />
      </svg>
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
    <svg viewBox="70 120 860 860" className="aspect-square w-full rounded-xl border border-border bg-[#f3f3f3]" aria-hidden>
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

/**
 * The product photo, the way Printful builds its mockups: the shirt colour underneath, the design on
 * the print area, then the photo's shading on top (it's mostly transparent where the fabric is).
 */
function ShirtPreview({
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
      className="relative aspect-square overflow-hidden rounded-xl border border-border transition-colors"
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

// Pull what the shop needs about each Printful product (colours, sizes, variant ids, print area,
// mockup template, costs before VAT) into src/lib/merch/catalog.json, and its blank photo into public/merch/.
// Rerun when the products change:
//   npm run merch:catalog
import { mkdir, writeFile } from "node:fs/promises";

/** Printful catalog products sold in the shop, and the placement each one is printed on. */
const PRODUCTS = [{ id: 456, placement: "front", technique: "dtg" }];

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

const token = process.env.PRINTFUL_API_TOKEN ?? process.env.PRINTFUL_API_KEY;
if (!token) throw new Error("PRINTFUL_API_TOKEN is not set");

/**
 * What Printful really bills for one item printed on `placement`, shipped to France, in euros:
 * the item before VAT (blank + first print) and the shipping. The catalog prices endpoint lists
 * higher, undiscounted amounts, so we ask for an order estimate instead.
 */
async function estimate(variantId, placement) {
  const res = await fetch("https://api.printful.com/orders/estimate-costs", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { name: "Estimate", address1: "1 rue de Paris", city: "Paris", zip: "75011", country_code: "FR" },
      currency: "EUR",
      // Any reachable image will do: the price doesn't depend on the design.
      items: [{ variant_id: variantId, quantity: 1, files: [{ type: placement, url: "https://www.pixicons.io/opengraph-image.jpg" }] }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`estimate ${variantId}: ${body.error?.message ?? res.status}`);
  return { item: body.result.costs.subtotal, shipping: body.result.costs.shipping };
}

async function get(path) {
  const res = await fetch(`https://api.printful.com/v2${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path}: ${body.error?.message ?? res.status}`);
  return body;
}

/** Every item of a paginated list. */
async function all(path, limit = 100) {
  const items = [];
  for (let offset = 0; ; offset += limit) {
    const { data, paging } = await get(`${path}${path.includes("?") ? "&" : "?"}limit=${limit}&offset=${offset}`);
    items.push(...data);
    if (!paging || offset + limit >= paging.total) return items;
  }
}

const catalog = [];
for (const { id, placement, technique } of PRODUCTS) {
  const { data: product } = await get(`/catalog-products/${id}`);
  const variants = await all(`/catalog-products/${id}/catalog-variants`);
  const templates = await all(`/catalog-products/${id}/mockup-templates`);
  const { data: styles } = await get(`/catalog-products/${id}/mockup-styles?limit=100`);

  const { data: sizeGuide } = await get(`/catalog-products/${id}/sizes?unit=cm`);
  // The garment's own measurements, flat ("product_measure"), rather than the body ones.
  const measures = sizeGuide.size_tables.find((t) => t.type === "product_measure" && t.unit === "cm");
  const sizeChart = measures && {
    unit: "cm",
    rows: measures.measurements.map((m) => ({
      label: m.type_label,
      values: Object.fromEntries(m.values.map((v) => [v.size, v.value ?? `${Math.round(v.min_value)}–${Math.round(v.max_value)}`])),
    })),
  };

  const area = styles.find((s) => s.placement === placement && s.technique === technique);
  const template = templates.find((t) => t.placement === placement && t.technique === technique && t.role === "primary");
  if (!area || !template) throw new Error(`${id}: no ${technique} ${placement} placement`);

  // The cost depends on the size, not the colour: estimate one variant of each size.
  const sizeCost = {};
  let shipping = 0;
  for (const size of SIZE_ORDER) {
    const v = variants.find((x) => x.size === size);
    if (!v) continue;
    const e = await estimate(v.id, placement);
    sizeCost[size] = e.item;
    shipping = e.shipping;
  }
  const colors = product.colors.map((c) => ({
    name: c.name,
    hex: c.value,
    sizes: variants
      .filter((v) => v.color === c.name)
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
      .map((v) => ({ size: v.size, variantId: v.id, cost: sizeCost[v.size] })),
  }));

  // Serve the blank photo ourselves rather than hotlinking Printful's CDN.
  const image = `/merch/${id}-${placement}.png`;
  await mkdir(new URL("../public/merch/", import.meta.url), { recursive: true });
  await writeFile(new URL(`../public${image}`, import.meta.url), Buffer.from(await (await fetch(template.image_url)).arrayBuffer()));

  catalog.push({
    id,
    name: product.name,
    placement,
    technique,
    /** Print area in inches, and the resolution Printful expects the file at. */
    printArea: { width: area.print_area_width, height: area.print_area_height, dpi: area.dpi },
    /** Printful's shipping for one item to France, before VAT. Sizes' `cost` is the item before VAT. */
    shipping,
    /** Blank product photo, tinted with the colour underneath; the print area is in template pixels. */
    template: {
      image,
      width: template.template_width,
      height: template.template_height,
      area: {
        left: template.print_area_left,
        top: template.print_area_top,
        width: template.print_area_width,
        height: template.print_area_height,
      },
    },
    colors,
    /** Garment measurements per size: one row per measure (length, width…). */
    sizeChart,
  });
}

const out = new URL("../src/lib/merch/catalog.json", import.meta.url);
await writeFile(out, JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog: ${catalog.map((p) => `${p.name} (${p.colors.length} colours)`).join(", ")}`);

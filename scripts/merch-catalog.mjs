// Pull what the shop needs about each Printful product (colours, sizes, variant ids, print area,
// mockup template, costs before VAT) into src/lib/merch/catalog.json, and its blank photo into public/merch/.
// Rerun when the products change:
//   npm run merch:catalog
import { mkdir, writeFile } from "node:fs/promises";

/**
 * Printful catalog products sold in the shop, the placement each one is printed on, and the sizes
 * kept (all of them when unset).
 */
const PRODUCTS = [
  { id: 456, placement: "front", technique: "dtg" },
  { id: 407, placement: "default", technique: "sublimation" },
];

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "12 oz"];

/** Colours of products that list none (the enamel mug only comes in white). */
const COLOR_HEX = { White: "#ffffff" };

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

async function get(path, version = "/v2") {
  const res = await fetch(`https://api.printful.com${version}${path}`, { headers: { Authorization: `Bearer ${token}` } });
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
for (const { id, placement, technique, sizes } of PRODUCTS) {
  const { data: product } = await get(`/catalog-products/${id}`);
  // Only the sizes we sell, in stock for Europe (some colours can't be made there).
  const { data: availability } = await get(`/catalog-products/${id}/availability?selling_region_name=europe&limit=100`);
  const inStock = new Set(
    availability
      .filter((a) => a.techniques.some((t) => t.technique === technique && t.selling_regions.some((r) => r.availability === "in stock")))
      .map((a) => a.catalog_variant_id),
  );
  const variants = (await all(`/catalog-products/${id}/catalog-variants`)).filter(
    (v) => inStock.has(v.id) && (!sizes || sizes.includes(v.size)),
  );
  const templates = await all(`/catalog-products/${id}/mockup-templates`);

  // Garments have a size guide, mugs don't.
  const sizeGuide = await get(`/catalog-products/${id}/sizes?unit=cm`).then((r) => r.data, () => null);
  // The garment's own measurements, flat ("product_measure"), rather than the body ones.
  const measures = sizeGuide?.size_tables.find((t) => t.type === "product_measure" && t.unit === "cm");
  const sizeChart = measures && {
    unit: "cm",
    rows: measures.measurements.map((m) => ({
      label: m.type_label,
      values: Object.fromEntries(m.values.map((v) => [v.size, v.value ?? `${Math.round(v.min_value)}–${Math.round(v.max_value)}`])),
    })),
  };

  // The print file of the variants we sell (a product's sizes can have different ones, like mugs).
  const { result: files } = await get(`/mockup-generator/printfiles/${id}?technique=${technique.toUpperCase()}`, "");
  const fileIds = new Set(variants.map((v) => files.variant_printfiles.find((f) => f.variant_id === v.id)?.placements[placement]));
  if (fileIds.size !== 1) throw new Error(`${id}: expected one ${placement} print file, got ${[...fileIds]}`);
  const file = files.printfiles.find((f) => f.printfile_id === [...fileIds][0]);
  const template = templates.find(
    (t) => t.placement === placement && t.technique === technique && (t.role === "primary" || t.role === "template") && t.catalog_variant_ids.includes(variants[0].id),
  );
  if (!template) throw new Error(`${id}: no ${technique} ${placement} template`);

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
  const productColors = product.colors.length
    ? product.colors
    : [...new Set(variants.map((v) => v.color))].map((name) => ({ name, value: COLOR_HEX[name] }));
  const colors = productColors
    .map((c) => ({
    name: c.name,
    hex: c.value,
    sizes: variants
      .filter((v) => v.color === c.name)
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
      .map((v) => ({ size: v.size, variantId: v.id, cost: sizeCost[v.size] })),
    }))
    .filter((c) => c.sizes.length > 0);

  // Serve the blank photo ourselves rather than hotlinking Printful's CDN. Some products (mugs)
  // only have a layout guide, not a photo: the shop draws those itself.
  await mkdir(new URL("../public/merch/", import.meta.url), { recursive: true });
  const save = async (path, url) =>
    writeFile(new URL(`../public${path}`, import.meta.url), Buffer.from(await (await fetch(url)).arrayBuffer()));
  let image = null;
  let photo = null;
  if (template.role === "primary") {
    image = `/merch/${id}-${placement}.png`;
    await save(image, template.image_url);
  } else {
    // Printful's own photo of the blank product, for a preview drawn on top of it.
    photo = `/merch/${id}.jpg`;
    await save(photo, variants[0].image);
  }

  catalog.push({
    id,
    name: product.name,
    placement,
    technique,
    /** Print area in inches, and the resolution Printful expects the file at. */
    printArea: { width: file.width / file.dpi, height: file.height / file.dpi, dpi: file.dpi },
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
    /** Photo of the blank product (when there's no mockup template): the shop places the design on it. */
    photo,
    colors,
    /** Garment measurements per size: one row per measure (length, width…). */
    sizeChart: sizeChart ?? null,
  });
}

const out = new URL("../src/lib/merch/catalog.json", import.meta.url);
await writeFile(out, JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog: ${catalog.map((p) => `${p.name} (${p.colors.length} colours)`).join(", ")}`);

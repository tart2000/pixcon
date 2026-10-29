import { Resvg } from "@resvg/resvg-js";
import { getValidatedIconByName } from "@/lib/db";
import { findProduct, findProductInk, isStyle, isVariant, printSvg } from "@/lib/merch/products";

/**
 * Print file of a design, as Printful expects it: a transparent PNG covering the whole print area.
 * GET /api/merch/print?product=tshirt&icon=heart&style=pixel&variant=regular&ink=e5484d
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const product = findProduct(params.get("product"));
  const ink = product && findProductInk(product, `#${params.get("ink")}`);
  const style = params.get("style");
  const variant = params.get("variant");
  const name = params.get("icon");
  if (!product || !ink || !isStyle(style) || !isVariant(variant) || !name) {
    return new Response("Invalid design", { status: 400 });
  }

  const icon = await getValidatedIconByName(name);
  const pixels = variant === "fill" ? icon?.pixels_fill : icon?.pixels;
  if (!pixels) return new Response("Icon not found", { status: 404 });

  const png = new Resvg(printSvg(product, pixels, style, ink.hex)).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Redrawing an icon changes its print file, so let CDNs keep it a day, not forever.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

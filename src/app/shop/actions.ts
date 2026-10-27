"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getValidatedIconByName } from "@/lib/db";
import { STYLES } from "@/lib/svg";
import { SHIPPING_COUNTRIES, SHIPPING_PRICE, findColor, findInk, findProduct, isStyle, isVariant, priceOf } from "@/lib/merch/products";
import { stripe } from "@/lib/merch/stripe";
import { SITE_URL } from "@/lib/merch/printful";

export type Design = { product: string; icon: string; style: string; variant: string; ink: string; color: string; size: string };

/**
 * Open a Stripe Checkout for one design. Everything is checked and priced again here: the browser
 * only says what was picked. The design rides along in the session's metadata for the webhook.
 */
export async function startCheckout(design: Design) {
  const product = findProduct(design.product);
  const ink = findInk(design.ink);
  const color = product && findColor(product, design.color);
  const sized = color?.sizes.find((s) => s.size === design.size);
  if (!product || !ink || !color || !sized || !isStyle(design.style) || !isVariant(design.variant)) {
    throw new Error("Invalid design");
  }
  const icon = await getValidatedIconByName(design.icon);
  if (!icon || (design.variant === "fill" && !icon.pixels_fill)) throw new Error("Icon not found");

  const style = STYLES.find((s) => s.id === design.style)!.label;
  const origin = (await headers()).get("origin") ?? SITE_URL;
  const back = `/shop?${new URLSearchParams({ icon: icon.name, style: design.style, variant: design.variant, ink: ink.hex.slice(1), color: color.name.toLowerCase(), size: sized.size })}`;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 },
        price_data: {
          currency: "eur",
          unit_amount: Math.round(priceOf(product, sized.cost) * 100),
          product_data: {
            name: `${product.label} · ${icon.name}`,
            description: `${style} ${design.variant} icon in ${ink.name.toLowerCase()} · ${color.name} · ${sized.size}`,
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard shipping",
          fixed_amount: { amount: Math.round(SHIPPING_PRICE * 100), currency: "eur" },
          // Printful prints in 2–5 business days, then 3–6 days of delivery in the EU.
          delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } },
        },
      },
    ],
    // Couriers ask for it to arrange the delivery.
    phone_number_collection: { enabled: true },
    metadata: {
      product: product.slug,
      icon: icon.name,
      style: design.style,
      variant: design.variant,
      ink: ink.hex,
      color: color.name,
      size: sized.size,
      variant_id: String(sized.variantId),
    },
    success_url: `${origin}/shop/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${back}`,
  });
  redirect(session.url!);
}

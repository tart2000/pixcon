"use server";

import { headers } from "next/headers";
import { BUNDLE_PRICE } from "@/lib/bundle";
import { stripe } from "@/lib/merch/stripe";
import { SITE_URL } from "@/lib/merch/printful";

/** Stripe product tax code "General - Electronically Supplied Services": a download. */
const TAX_CODE_DIGITAL = "txcd_10000000";

/** Create a Stripe Checkout for the bundle and return its URL (see startCheckout in the shop for why not redirect). */
export async function startBundleCheckout() {
  const origin = (await headers()).get("origin") ?? SITE_URL;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: BUNDLE_PRICE * 100,
          tax_behavior: "inclusive",
          product_data: {
            name: "Pixicons bundle",
            description: "Every Pixicons icon, in every style and variant, as SVG and 512 px PNG. Free updates.",
            tax_code: TAX_CODE_DIGITAL,
          },
        },
      },
    ],
    // VAT from the buyer's country, worked out by Stripe Tax like the shop's.
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    // Stripe makes the invoice and emails it with the receipt.
    invoice_creation: {
      enabled: true,
      invoice_data: { description: "Pixicons bundle · digital download", footer: "Pixicons · www.pixicons.io" },
    },
    // EU law: a download started right away waives the 14-day withdrawal right, if the buyer agrees to it.
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message: `I agree to the [terms of sale](${SITE_URL}/terms) and to get the download right away, which waives my 14-day right of withdrawal.`,
      },
    },
    metadata: { kind: "bundle" },
    success_url: `${origin}/bundle/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/bundle`,
  });
  return session.url!;
}

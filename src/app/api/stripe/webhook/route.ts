import type Stripe from "stripe";
import { stripe } from "@/lib/merch/stripe";
import { createDraftOrder, SITE_URL } from "@/lib/merch/printful";
import { SHIPPING_PRICE, findInk, findProduct, isStyle, isVariant, printUrl } from "@/lib/merch/products";

/**
 * Stripe calls this when a checkout is paid: we pass the order on to Printful, as a draft.
 * Anything but a 2xx makes Stripe retry, so a failed Printful call is answered with a 500.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not set", { status: 500 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Card payments complete at once; slower methods confirm later with async_payment_succeeded.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      try {
        await sendToPrintful(session);
      } catch (e) {
        console.error(`Printful order for ${session.id} failed:`, e);
        return new Response("Printful order failed", { status: 500 });
      }
    }
  }
  return Response.json({ received: true });
}

async function sendToPrintful(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const product = findProduct(m.product);
  const ink = findInk(m.ink);
  if (!product || !ink || !isStyle(m.style) || !isVariant(m.variant) || !m.icon || !m.variant_id) {
    throw new Error(`Unexpected metadata: ${JSON.stringify(m)}`);
  }
  const shipping = session.collected_information?.shipping_details;
  if (!shipping) throw new Error("No shipping address");
  const { address } = shipping;

  const [line] = (await stripe().checkout.sessions.listLineItems(session.id)).data;
  const quantity = line?.quantity ?? 1;

  return createDraftOrder({
    // Printful ids are at most 32 characters: the payment intent's fits, the session's doesn't.
    externalId: String(session.payment_intent),
    recipient: {
      name: shipping.name,
      address1: address.line1 ?? "",
      address2: address.line2 ?? undefined,
      city: address.city ?? "",
      state_code: address.state || undefined,
      country_code: address.country ?? "",
      zip: address.postal_code ?? "",
      email: session.customer_details?.email ?? undefined,
      phone: session.customer_details?.phone ?? undefined,
    },
    items: [
      {
        catalogVariantId: Number(m.variant_id),
        quantity,
        retailPrice: (line?.amount_total ?? 0) / 100 / quantity,
        name: `${product.label} · ${m.icon} · ${m.color} ${m.size}`,
        placement: product.catalog.placement,
        technique: product.catalog.technique,
        fileUrl: SITE_URL + printUrl({ product: product.slug, icon: m.icon, style: m.style, variant: m.variant, ink: ink.hex }),
        area: product.catalog.printArea,
      },
    ],
    shipping: SHIPPING_PRICE,
  });
}

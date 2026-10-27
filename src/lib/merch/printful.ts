import "server-only";

/**
 * Where Printful downloads print files from. It must reach our print route over the internet,
 * so local tests also point at the live site.
 */
export const SITE_URL = process.env.SITE_URL ?? "https://www.pixicons.io";

async function printful<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.PRINTFUL_API_TOKEN ?? process.env.PRINTFUL_API_KEY;
  if (!token) throw new Error("PRINTFUL_API_TOKEN is not set");
  const res = await fetch(`https://api.printful.com/v2${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Printful ${path}: ${body?.error?.message ?? res.status}`);
  return body as T;
}

export type PrintfulRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
};

export type PrintfulItem = {
  catalogVariantId: number;
  quantity: number;
  /** What the customer paid for one, VAT included, for Printful's records. */
  retailPrice: number;
  name: string;
  placement: string;
  technique: string;
  /** Absolute URL of the print file, covering the whole print area. */
  fileUrl: string;
  /** Print area in inches. */
  area: { width: number; height: number };
};

/** Order already sent to Printful under this id (ours), or null. */
async function findOrder(externalId: string) {
  try {
    const { data } = await printful<{ data: { id: number } }>(`/orders/@${encodeURIComponent(externalId)}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Create a Printful order as a draft: nothing is printed or billed until it's confirmed in the
 * Printful dashboard. `externalId` (at most 32 characters) makes it safe to call twice.
 */
export async function createDraftOrder(order: {
  externalId: string;
  recipient: PrintfulRecipient;
  items: PrintfulItem[];
  shipping: number;
}) {
  const existing = await findOrder(order.externalId);
  if (existing) return existing;
  const { data } = await printful<{ data: { id: number } }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      external_id: order.externalId,
      shipping: "STANDARD",
      recipient: order.recipient,
      order_items: order.items.map((i) => ({
        source: "catalog",
        catalog_variant_id: i.catalogVariantId,
        quantity: i.quantity,
        retail_price: i.retailPrice.toFixed(2),
        name: i.name,
        placements: [
          {
            placement: i.placement,
            technique: i.technique,
            layers: [{ type: "file", url: i.fileUrl, position: { width: i.area.width, height: i.area.height, top: 0, left: 0 } }],
          },
        ],
      })),
      retail_costs: { currency: "EUR", shipping: order.shipping.toFixed(2) },
      // Printful wants at least a message, email, phone or order id on the packing slip.
      customization: { packing_slip: { store_name: "Pixicons", message: "Thanks for wearing Pixicons! · pixicons.io" } },
    }),
  });
  return data;
}

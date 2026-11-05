import "server-only";
import { randomBytes } from "node:crypto";
import { head, issueSignedToken, presignUrl } from "@vercel/blob";
import type Stripe from "stripe";
import { sql } from "./db";
import { VARIANTS } from "./pixels";
import { STYLES } from "./svg";
import { sendEmail } from "./email";
import { SITE_URL } from "./merch/printful";

/** Price of the bundle, in euros, VAT included. */
export const BUNDLE_PRICE = 12;

/**
 * How many icons the bundle holds, counting each style and variant of a drawing as an icon, rounded down to the
 * thousand so the "+" stays true: 1,026 drawings × 15 styles × 2 variants → "30,000+".
 */
export const bundleIconCount = (drawings: number) =>
  `${(Math.floor((drawings * STYLES.length * VARIANTS.length) / 1000) * 1000).toLocaleString("en")}+`;
/** Where scripts/build-bundle.mjs puts the zip in the private Blob store. */
const BLOB_PATH = "bundle/pixicons.zip";
/** How long a download link handed to the browser works: enough to start a big download. */
const LINK_TTL = 60 * 60 * 1000;

/** The buyer's permanent link: it checks the purchase, then hands out a short-lived link to the latest zip. */
export const downloadPath = (token: string) => `/bundle/d/${token}`;

type Purchase = { id: number; token: string; email: string; emailed_at: string | null };

/**
 * Record a paid bundle checkout and email its download link, once. Called by the Stripe webhook and by the thank-you
 * page, whichever comes first: both are safe to run twice. Throws when the email can't be sent, so the webhook
 * answers with an error and Stripe tries again later.
 */
export async function fulfillBundle(session: Stripe.Checkout.Session): Promise<Purchase> {
  const email = session.customer_details?.email;
  if (session.payment_status !== "paid" || !email) throw new Error(`Bundle session ${session.id} isn't paid`);

  await sql`
    INSERT INTO purchases (token, session_id, email, amount, currency)
    VALUES (${randomBytes(18).toString("base64url")}, ${session.id}, ${email}, ${session.amount_total ?? 0}, ${session.currency ?? "eur"})
    ON CONFLICT (session_id) DO NOTHING
  `;
  // Claim the email: only one caller gets the row back, so it isn't sent twice.
  const [claimed] = (await sql`
    UPDATE purchases SET emailed_at = now() WHERE session_id = ${session.id} AND emailed_at IS NULL
    RETURNING id, token, email, emailed_at
  `) as Purchase[];
  if (claimed) {
    try {
      await sendLink(claimed);
    } catch (e) {
      await sql`UPDATE purchases SET emailed_at = NULL WHERE id = ${claimed.id}`;
      throw e;
    }
    return claimed;
  }
  const [row] = (await sql`SELECT id, token, email, emailed_at FROM purchases WHERE session_id = ${session.id}`) as Purchase[];
  return row;
}

function sendLink(p: Purchase) {
  const url = SITE_URL + downloadPath(p.token);
  return sendEmail({
    to: p.email,
    subject: "Your Pixicons bundle",
    text: `Thanks for buying the Pixicons bundle!

Download it here: ${url}

This link is yours and it doesn't expire: it always serves the latest bundle, with every icon added since you bought it. Keep this email to download it again.

Your invoice comes in a separate email from Stripe. Any question? Just reply to this email.

Pixicons · ${SITE_URL}`,
    html: `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#171717;max-width:520px;line-height:1.5">
<p>Thanks for buying the Pixicons bundle!</p>
<p><a href="${url}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Download the bundle</a></p>
<p>This link is yours and it doesn't expire: it always serves the latest bundle, with every icon added since you bought it. Keep this email to download it again.</p>
<p style="color:#737373;font-size:14px">Your invoice comes in a separate email from Stripe. Any question? Just reply to this email.</p>
<p style="color:#737373;font-size:14px">Pixicons · <a href="${SITE_URL}" style="color:#737373">pixicons.io</a></p>
</div>`,
  });
}

/** The purchase behind a download link, counting the download; null for an unknown token. */
export async function recordBundleDownload(token: string): Promise<{ email: string } | null> {
  const [row] = await sql`
    UPDATE purchases SET downloads = downloads + 1, last_download_at = now() WHERE token = ${token} RETURNING email
  `;
  return (row as { email: string } | undefined) ?? null;
}

/** A link to the latest zip that works for a short while. */
export async function signedBundleUrl() {
  const validUntil = Date.now() + LINK_TTL;
  const token = await issueSignedToken({ pathname: BLOB_PATH, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname: BLOB_PATH, validUntil, access: "private" });
  return presignedUrl;
}

/** Size of the current zip in bytes, or null when it can't be read (no token in this environment). */
export async function bundleSize(): Promise<number | null> {
  return (await head(BLOB_PATH).catch(() => null))?.size ?? null;
}

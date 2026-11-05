import Link from "next/link";
import { connection } from "next/server";
import { downloadPath, fulfillBundle } from "@/lib/bundle";
import { stripe } from "@/lib/merch/stripe";

export const metadata = { title: "Thank you", robots: { index: false } };

export default async function BundleThanksPage({ searchParams }: PageProps<"/bundle/thanks">) {
  await connection();
  const id = (await searchParams).session_id;
  const session = typeof id === "string" ? await stripe().checkout.sessions.retrieve(id).catch(() => null) : null;
  const paid = session?.payment_status === "paid" && session.metadata?.kind === "bundle";
  // Usually the webhook got here first; if not, record the purchase (and send its email) now.
  const purchase = paid ? await fulfillBundle(session).catch(() => null) : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center">
      <h1 className="font-display text-5xl">{purchase ? "It's all yours!" : paid ? "Almost there" : "Purchase not found"}</h1>
      {purchase ? (
        <>
          <p className="text-lg text-muted">
            Thanks for buying the bundle. Your link is also on its way to{" "}
            <span className="text-foreground">{purchase.email}</span>, with your invoice in a separate email. It
            doesn&apos;t expire, and always serves the latest bundle.
          </p>
          <a href={downloadPath(purchase.token)} className="btn-fun btn-fun-primary">
            Download pixicons.zip
          </a>
          <p className="text-sm text-muted">About 250 MB: it may take a minute.</p>
        </>
      ) : (
        <p className="text-lg text-muted">
          {paid
            ? "Your payment went through, but we couldn't prepare your link just yet. Reload this page in a moment; it's also coming by email."
            : "We couldn't find this payment. If you were charged, reply to your receipt and we'll sort it out."}
        </p>
      )}
      <Link href="/icons" className="btn-fun">
        Back to the icons
      </Link>
    </div>
  );
}

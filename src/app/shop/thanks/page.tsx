import Link from "next/link";
import { connection } from "next/server";
import { stripe } from "@/lib/merch/stripe";

export const metadata = { title: "Thank you", robots: { index: false } };

export default async function ThanksPage({ searchParams }: PageProps<"/shop/thanks">) {
  await connection();
  const id = (await searchParams).session_id;
  const session = typeof id === "string" ? await stripe().checkout.sessions.retrieve(id).catch(() => null) : null;
  const paid = session?.payment_status === "paid";
  const name = session?.collected_information?.shipping_details?.name?.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center">
      <h1 className="font-display text-5xl">{paid ? `Thank you${name ? `, ${name}` : ""}!` : "Order not found"}</h1>
      <p className="text-lg text-muted">
        {paid ? (
          <>
            Your order is in. A receipt is on its way to{" "}
            <span className="text-foreground">{session.customer_details?.email}</span>. Your T-shirt is printed on
            demand and usually arrives within 5 to 10 business days.
          </>
        ) : (
          "We couldn't find this payment. If you were charged, reply to your receipt and we'll sort it out."
        )}
      </p>
      <Link href="/shop" className="btn-fun">
        Back to the shop
      </Link>
    </div>
  );
}

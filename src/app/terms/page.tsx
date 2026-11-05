import Link from "next/link";
import { BUNDLE_PRICE } from "@/lib/bundle";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta("Terms of sale", "What you get when you buy on Pixicons, and how it works.", "/terms");

/** Seller details, shown first: French law asks for them on any site that sells. */
const SELLER = {
  name: "POC studio",
  email: "hello@pixicons.io",
  site: "https://pocstudio.fr",
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Terms of sale</h1>
        <p className="text-muted">Last updated on 5 November 2026.</p>
      </header>

      <Section title="Who sells">
        <p>
          Pixicons is made and sold by {SELLER.name} (
          <a href={SELLER.site} className="text-foreground underline underline-offset-4">
            pocstudio.fr
          </a>
          ). Write to{" "}
          <a href={`mailto:${SELLER.email}`} className="text-foreground underline underline-offset-4">
            {SELLER.email}
          </a>{" "}
          for anything about an order.
        </p>
      </Section>

      <Section title="The icons are free">
        <p>
          Every icon can be used for free, one by one, from{" "}
          <Link href="/icons" className="text-foreground underline underline-offset-4">
            the library
          </Link>{" "}
          or with the script, under the MIT licence. What you pay for is the convenience of the bundle, or a printed
          object from the shop.
        </p>
      </Section>

      <Section title="The bundle">
        <p>
          A zip file with every icon of the library in every style and variant, as SVG and PNG files. It costs €
          {BUNDLE_PRICE}, VAT included, paid once by card or the other means offered at checkout, through Stripe.
        </p>
        <p>
          Once the payment goes through, you get a download link on screen and by email. The link doesn&apos;t expire
          and always serves the latest version of the bundle, with the icons added since your purchase. It is for you:
          please don&apos;t share it. An invoice is emailed to you by Stripe.
        </p>
        <p>
          The files are under the MIT licence, like the library: you may use them in personal and commercial work.
        </p>
      </Section>

      <Section title="Right of withdrawal">
        <p>
          The bundle is digital content delivered right away. At checkout you agree to get it immediately and so to
          waive the 14-day right of withdrawal (article L221-28 13° of the French Consumer Code). If the download
          doesn&apos;t work, write to us and we&apos;ll fix it or refund you.
        </p>
        <p>
          Shop items are printed to order with the design you chose, so they can&apos;t be returned for a change of
          mind (article L221-28 3°). A damaged or faulty item is replaced or refunded: write to us with a photo within
          30 days of delivery.
        </p>
      </Section>

      <Section title="The shop">
        <p>
          Prices include VAT; shipping is shown before you pay. Items are printed and shipped by our partner Printful,
          usually within 5 to 10 business days in Europe.
        </p>
      </Section>

      <Section title="Personal data">
        <p>
          We keep your email and the details of your order to deliver it, send your link and invoice, and answer you.
          Payments are handled by Stripe; we never see your card. Write to us to see or delete your data.
        </p>
      </Section>

      <Section title="Disputes">
        <p>
          These terms are under French law. Write to us first: we&apos;ll find a solution. You can also use the
          European Commission&apos;s online dispute resolution platform.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-muted">
      <h2 className="font-display text-3xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}

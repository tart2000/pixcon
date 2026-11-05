import Link from "next/link";
import { BUNDLE_PRICE, bundleIconCount, bundleSize } from "@/lib/bundle";
import { listGalleryIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { VARIANTS } from "@/lib/pixels";
import { STYLES } from "@/lib/svg";
import { BundleBuyButton } from "@/components/BundleBuyButton";
import { BundleWall } from "@/components/BundleWall";

export async function generateMetadata() {
  const included = bundleIconCount((await listGalleryIcons()).length);
  return pageMeta(
    "The bundle",
    `${included} icons: every Pixicons drawing in all ${STYLES.length} styles and both variants, as SVG and 512 px PNG files. One zip, €${BUNDLE_PRICE}, free updates.`,
    "/bundle",
  );
}

// The figures follow the library: refreshed hourly, like the icon pages.
export const revalidate = 3600;

/** Formats, one zip per buyer, the same everywhere: SVG then PNG. */
const FORMATS = ["svg", "png"] as const;
const TILES = 45;
/** Icons the wall picks from: enough for variety, few enough to keep the page light. */
const SAMPLE = 120;

export default async function BundlePage() {
  const [icons, bytes] = await Promise.all([listGalleryIcons(), bundleSize()]);
  const files = icons.length * STYLES.length * VARIANTS.length * FORMATS.length;
  const included = bundleIconCount(icons.length);
  // A sample spread over the whole library for the wall: the first tiles, then what they turn into.
  const sample = Array.from({ length: Math.min(SAMPLE, icons.length) }, (_, n) => icons[Math.floor((n * icons.length) / SAMPLE)]);
  const example = icons.find((i) => i.name === "heart") ?? icons[0];

  const stats = [
    { value: included, label: "Icons included" },
    { value: icons.length.toLocaleString("en"), label: "Handmade drawings" },
    {
      // The display font has no "×": draw it in the text font.
      value: (
        <>
          {STYLES.length} <span className="font-sans font-light">×</span> {VARIANTS.length}
        </>
      ),
      label: "Styles × variants",
    },
    { value: files.toLocaleString("en"), label: `Files${bytes ? ` · ${Math.round(bytes / 1e6)} MB zipped` : ""}` },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs tracking-wide text-muted">
          The bundle · €{BUNDLE_PRICE}
        </span>
        <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl">
          Every icon.
          <br />
          Every style.
          <br />
          One zip.
        </h1>
        <p className="font-display text-3xl sm:text-4xl">{included} icons included!</p>
        <p className="max-w-xl text-lg text-muted">
          The whole library on your disk: all {icons.length.toLocaleString("en")} drawings in {STYLES.length} styles,
          regular and fill, as SVG and 512 px PNG. Ready for Figma, Keynote, your app or anything that opens a file.
        </p>
        <BundleBuyButton label={`Get the bundle · €${BUNDLE_PRICE}`} />
        <p className="text-sm text-muted">
          Every icon stays free to use, one by one,{" "}
          <Link href="/icons" className="text-foreground underline underline-offset-4">
            in the library
          </Link>
          . The bundle saves you {files.toLocaleString("en")} clicks.
        </p>
      </section>

      <BundleWall drawings={sample.map((i) => ({ name: i.name, pixels: i.pixels, fill: i.fill }))} count={TILES} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-5">
            <span className="font-display text-5xl">{s.value}</span>
            <span className="text-sm text-muted">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-3xl">Tidy inside</h2>
          <p className="text-muted">
            One folder per format, style and variant. Every file says what it is, so it stays findable once it&apos;s
            out of its folder.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-sm leading-relaxed text-on-foreground">
            {`pixicons/
  svg/
    ${STYLES[0].id}/
      regular/
        ${example.name}_regular_${STYLES[0].id}.svg
      fill/
    …
  png/
    …
  README.txt
  LICENSE.txt`}
          </pre>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-3xl">Good to know</h2>
          <dl className="flex flex-col gap-4 text-muted">
            {[
              ["Free updates", "Your download link doesn't expire and always serves the latest bundle, new icons included."],
              ["SVG", "Vector, any size. They take the colour of the text around them, black anywhere else."],
              ["PNG", "512 × 512 px, black on a transparent background."],
              ["Licence", "MIT, like the library: use them in personal and commercial projects."],
              ["Invoice", "Sent by email with your receipt, VAT included."],
            ].map(([term, text]) => (
              <div key={term}>
                <dt className="font-semibold text-foreground">{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-background px-6 py-12 text-center">
        <h2 className="font-display text-4xl">
          {included} icons, for €{BUNDLE_PRICE}.
        </h2>
        <p className="max-w-md text-muted">Pay once, download right away, and get every new icon for free.</p>
        <BundleBuyButton label={`Get the bundle · €${BUNDLE_PRICE}`} />
        <Link href="/terms" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
          Terms of sale
        </Link>
      </section>
    </div>
  );
}

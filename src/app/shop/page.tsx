import { listIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { ShopFromUrl } from "@/components/shop/ShopBuilder";

export const metadata = pageMeta(
  "Shop",
  "Put any Pixicons icon on an organic T-shirt, a mug or a sticker: pick the icon, its style and colour, and the product.",
  "/shop",
);

// Static, refreshed daily and served from the CDN; the creator reads the link's settings in the browser.
export const revalidate = 86400;

export default async function ShopPage() {
  const icons = (await listIcons("public")).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Shop</h1>
        <p className="text-lg text-muted">Pick an icon, give it a style and a colour, and wear it, sip from it or stick it anywhere.</p>
      </header>
      <ShopFromUrl icons={icons.map(({ name, alts, pixels, pixels_fill }) => ({ name, alts, pixels, fill: pixels_fill }))} />
    </div>
  );
}

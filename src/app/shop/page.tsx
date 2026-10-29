import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { ShopBuilder } from "@/components/shop/ShopBuilder";

export const metadata = pageMeta(
  "Shop",
  "Put any Pixicons icon on an organic T-shirt or a mug: pick the icon, its style and colour, and the product.",
  "/shop",
);

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  await connection();
  const icons = (await listIcons("validated")).sort((a, b) => a.name.localeCompare(b.name));
  const params = await searchParams;
  const first = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Shop</h1>
        <p className="text-lg text-muted">Pick an icon, give it a style and a colour, and wear it or sip from it.</p>
      </header>
      <ShopBuilder
        icons={icons.map(({ name, alts, pixels, pixels_fill }) => ({ name, alts, pixels, fill: pixels_fill }))}
        initial={{
          product: first("product"),
          icon: first("icon"),
          style: first("style"),
          variant: first("variant"),
          ink: first("ink"),
          color: first("color"),
          size: first("size"),
        }}
      />
    </div>
  );
}

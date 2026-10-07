import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { IconGallery } from "@/components/IconGallery";

export const metadata = { title: "Icons · Pixcon" };

export default async function IconsPage() {
  // Live data per request; the static GitHub Pages export reads it once at build time.
  if (!process.env.STATIC_EXPORT) await connection();
  const icons = (await listIcons("validated")).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h1 className="sr-only">Icons</h1>
      <IconGallery icons={icons.map(({ id, name, alts, pixels, pixels_fill }) => ({ id, name, alts, pixels, fill: pixels_fill }))} />
    </>
  );
}

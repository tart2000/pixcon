import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { IconGallery } from "@/components/IconGallery";

export const metadata = pageMeta(
  "Icons",
  "Browse every Pixcon icon: search by name or tag, pick a style and a colour, then copy the HTML or the SVG.",
  "/icons",
);

export default async function IconsPage() {
  await connection();
  const icons = (await listIcons("validated")).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <h1 className="sr-only">Icons</h1>
      <IconGallery icons={icons.map(({ id, name, alts, pixels, pixels_fill, views, downloads }) => ({ id, name, alts, pixels, fill: pixels_fill, views, downloads }))} />
    </>
  );
}

import { connection } from "next/server";
import { listGalleryIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { IconGallery } from "@/components/IconGallery";

export const metadata = pageMeta(
  "Icons",
  "Browse every icon in Pixicons: search by name or tag, pick a style and a colour, then copy the HTML or the SVG.",
  "/icons",
);

export default async function IconsPage() {
  await connection();

  return (
    <>
      <h1 className="sr-only">Icons</h1>
      <IconGallery icons={await listGalleryIcons()} />
    </>
  );
}

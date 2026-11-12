import { listGalleryIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { IconGallery } from "@/components/IconGallery";

export const metadata = pageMeta(
  "Icons",
  "Browse every icon in Pixicons: search by name or tag, pick a style and a colour, then copy the HTML or the SVG.",
  "/icons",
);

// Static, refreshed daily and served from the CDN (the search, style and open icon are read from the URL
// in the browser): icons are drawn on a local server, which can't refresh the live site's pages itself.
export const revalidate = 86400;

export default async function IconsPage() {
  return (
    <>
      <h1 className="sr-only">Icons</h1>
      <IconGallery icons={await listGalleryIcons()} />
    </>
  );
}

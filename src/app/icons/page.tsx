import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { IconGallery } from "@/components/IconGallery";

export const metadata = { title: "Icons · Pixcon" };

export default async function IconsPage() {
  // Live data per request; the static GitHub Pages export reads it once at build time.
  if (!process.env.STATIC_EXPORT) await connection();
  const icons = (await listIcons("validated")).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Icons</h1>
        <p className="text-muted">
          Open-source 11×11 pixel icons, drawn together. Pick a variant and a style, then copy or download as SVG.
        </p>
      </div>
      <IconGallery icons={icons.map(({ id, name, alts, pixels, pixels_fill }) => ({ id, name, alts, pixels, fill: pixels_fill }))} />
    </div>
  );
}

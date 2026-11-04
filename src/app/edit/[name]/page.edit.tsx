import { notFound } from "next/navigation";
import { getIconByName, getIconPosition, listAlts } from "@/lib/db";
import { Editor } from "@/components/Editor";

// Typed by hand: this route only exists on the dev server, so PageProps<"/edit/[name]"> is missing from production builds.
export default async function IconPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const icon = await getIconByName(decodeURIComponent((await params).name));
  if (!icon) notFound();

  const [position, knownAlts] = await Promise.all([getIconPosition(icon.id), listAlts()]);
  const initialVariant = (await searchParams).variant === "fill" ? "fill" : "regular";

  return (
    <Editor
      key={icon.id}
      initialVariant={initialVariant}
      position={position}
      knownAlts={knownAlts}
      icon={{ id: icon.id, name: icon.name, alts: icon.alts, pixels: icon.pixels, fill: icon.pixels_fill, status: icon.status }}
    />
  );
}

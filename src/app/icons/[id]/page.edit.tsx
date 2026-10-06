import { notFound } from "next/navigation";
import { getIcon, getIconPosition, listAlts } from "@/lib/db";
import { Editor } from "@/components/Editor";

// Typed by hand: this route only exists on the dev server, so PageProps<"/icons/[id]"> is missing from production builds.
export default async function IconPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const icon = await getIcon(id);
  if (!icon) notFound();

  const [position, knownAlts] = await Promise.all([getIconPosition(id), listAlts()]);
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

import { notFound } from "next/navigation";
import { listGalleryIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { iconUrl } from "@/lib/paths";
import { STYLES } from "@/lib/svg";
import { IconPage } from "@/components/IconPage";

type Props = PageProps<"/icons/[name]">;

/** How many icons sharing a tag are shown under the icon. */
const RELATED = 20;

// One static page per validated icon, built ahead and refreshed hourly: icons are drawn on a
// local server, which can't refresh the live site's pages itself. New icons render on first visit.
export const revalidate = 3600;

// The build renders every page in a row: share one read of the icons between them for a minute.
let memo: { at: number; icons: ReturnType<typeof listGalleryIcons> } | null = null;
const galleryIcons = () => {
  if (!memo || Date.now() - memo.at > 60_000) {
    const icons = listGalleryIcons();
    memo = { at: Date.now(), icons };
    icons.catch(() => memo?.icons === icons && (memo = null)); // a failed read isn't kept
  }
  return memo.icons;
};

export async function generateStaticParams() {
  return (await galleryIcons()).map((i) => ({ name: i.name }));
}

const findIcon = async ({ params }: Props) => {
  const name = decodeURIComponent((await params).name);
  const icons = await galleryIcons();
  return { icon: icons.find((i) => i.name === name), icons };
};

export async function generateMetadata(props: Props) {
  const { icon } = await findIcon(props);
  if (!icon) return {};
  const tags = icon.alts.length ? ` (${icon.alts.slice(0, 5).join(", ")})` : "";
  return pageMeta(
    `${icon.name} pixel icon`,
    `Free ${icon.name} pixel icon${tags}, in ${STYLES.length} styles, regular or fill. Copy the HTML, or download it as SVG or PNG.`,
    iconUrl(icon.name),
  );
}

export default async function Page(props: Props) {
  const { icon, icons } = await findIcon(props);
  if (!icon) notFound();

  // Icons sharing the most tags first, then by name (the list already is).
  const tags = new Set(icon.alts);
  const related = icons
    .filter((i) => i.id !== icon.id)
    .map((i) => ({ i, shared: i.alts.filter((a) => tags.has(a)).length }))
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, RELATED)
    .map((r) => r.i);

  return <IconPage icon={icon} related={related} />;
}

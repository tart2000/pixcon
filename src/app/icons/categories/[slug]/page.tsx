import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CATEGORIES, categoryPath } from "@/lib/categories";
import { listGalleryIcons } from "@/lib/db";
import { pageMeta } from "@/lib/meta";
import { IconGallery } from "@/components/IconGallery";
import { styleFrom } from "@/lib/svg";

type Props = PageProps<"/icons/categories/[slug]">;

const findCategory = async ({ params }: Props) => {
  const { slug } = await params;
  return CATEGORIES.find((c) => c.slug === slug);
};

export async function generateMetadata(props: Props) {
  const category = await findCategory(props);
  if (!category) return {};
  return pageMeta(
    `${category.label} icons`,
    `Browse the ${category.label} pixel icons in Pixicons: pick a style and a colour, then copy the HTML or the SVG.`,
    categoryPath(category.slug),
  );
}

export default async function CategoryPage(props: Props) {
  const { searchParams } = props;
  const category = await findCategory(props);
  if (!category) notFound();
  await connection();

  return (
    <>
      <h1 className="sr-only">{category.label} icons</h1>
      <IconGallery icons={await listGalleryIcons()} initialStyle={styleFrom(await searchParams)} />
    </>
  );
}

import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { ManageList } from "@/components/ManageList";
import { canEdit } from "@/lib/editing";
import { pageMeta } from "@/lib/meta";
import { kitStatus } from "@/lib/kitPublish";
import { KitPublishBar } from "@/components/KitPublishBar";

export const metadata = pageMeta(canEdit ? "Manage" : "Requests", "Request a pixel icon and follow its progress.", "/manage");

export default async function ManagePage({ searchParams }: PageProps<"/manage">) {
  await connection();
  const { q } = await searchParams;
  const icons = await listIcons();
  const kit = canEdit ? await kitStatus() : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">{canEdit ? "Manage" : "Requests"}</h1>
        <p className="text-muted">
          {canEdit
            ? "Request icons, track what’s being drawn, and publish what’s ready."
            : "Ask for an icon and follow its progress. Search first: it may already be on its way."}
        </p>
      </div>
      {kit && <KitPublishBar {...kit} />}
      <ManageList
        initialQuery={typeof q === "string" ? q : ""}
        icons={icons.map((i) => ({
          id: i.id,
          name: i.name,
          alts: i.alts,
          pixels: i.pixels,
          fill: i.pixels_fill,
          status: i.status,
          views: i.views,
          downloads: i.downloads,
          createdAt: new Date(i.created_at).toISOString(),
          updatedAt: new Date(i.updated_at).toISOString(),
        }))}
      />
    </div>
  );
}

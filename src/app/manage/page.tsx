import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { ManageList } from "@/components/ManageList";
import { canEdit } from "@/lib/editing";
import { pageMeta } from "@/lib/meta";
import { pendingKitRebuild } from "@/lib/kitRebuild";
import { publishKitNow } from "@/app/actions";

export const metadata = pageMeta(canEdit ? "Manage" : "Requests", "Request a pixel icon and follow its progress.", "/manage");

export default async function ManagePage() {
  await connection();
  const icons = await listIcons();
  const rebuild = canEdit ? pendingKitRebuild() : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">{canEdit ? "Manage" : "Requests"}</h1>
        <p className="text-muted">
          {canEdit
            ? "Request icons, track what’s being drawn, and validate what’s ready to ship."
            : "Ask for an icon and follow its progress. Search first: it may already be on its way."}
        </p>
      </div>
      {rebuild && (
        <form
          action={publishKitNow}
          className="flex items-center justify-between gap-4 rounded-lg border border-border bg-subtle px-4 py-3 text-sm"
        >
          <span>
            {rebuild.at
              ? `The kit will be republished at ${new Date(rebuild.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
              : "Republishing the kit failed: its changes are still waiting."}
          </span>
          <button className="btn h-8 whitespace-nowrap">Publish now</button>
        </form>
      )}
      <ManageList
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

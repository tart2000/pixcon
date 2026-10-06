import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { ManageList } from "@/components/ManageList";
import { canEdit } from "@/lib/editing";

export const metadata = { title: `${canEdit ? "Manage" : "Requests"} · Pixcon` };

export default async function ManagePage() {
  await connection();
  const icons = await listIcons();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{canEdit ? "Manage" : "Requests"}</h1>
        <p className="text-muted">
          {canEdit
            ? "Request icons, track what’s being drawn, and validate what’s ready to ship."
            : "Ask for an icon and follow its progress. Search first: it may already be on its way."}
        </p>
      </div>
      <ManageList
        icons={icons.map((i) => ({
          id: i.id,
          name: i.name,
          alts: i.alts,
          pixels: i.pixels,
          fill: i.pixels_fill,
          status: i.status,
          updatedAt: new Date(i.updated_at).toISOString(),
        }))}
      />
    </div>
  );
}

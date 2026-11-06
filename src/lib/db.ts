import "server-only";
import { neon } from "@neondatabase/serverless";
import { PUBLIC_STATUSES, type Status } from "./status";

export const sql = neon(process.env.DATABASE_URL!);

export type Icon = {
  id: number;
  name: string;
  /** Regular variant. */
  pixels: string;
  /** Fill variant, null until someone draws it. */
  pixels_fill: string | null;
  status: Status;
  /** Alternative names used by search. */
  alts: string[];
  /** Times the icon was opened in the gallery popup. */
  views: number;
  /** Times the icon was downloaded as SVG from the gallery or its popup. */
  downloads: number;
  created_at: string;
  updated_at: string;
};

/** All icons, only those with the given status, or the public ones (new and validated); most recently updated first. */
export async function listIcons(status?: Status | "public"): Promise<Icon[]> {
  const statuses = status === "public" ? [...PUBLIC_STATUSES] : status ? [status] : null;
  return (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, created_at, updated_at FROM icons
    WHERE ${statuses}::text[] IS NULL OR status = ANY(${statuses}::text[])
    ORDER BY updated_at DESC
  `) as Icon[];
}

/** Public icons by name, as the gallery needs them; `isNew` for the latest published batch. */
export async function listGalleryIcons() {
  return (await listIcons("public"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, alts, pixels, pixels_fill, views, downloads, status }) => ({
      id,
      name,
      alts,
      pixels,
      fill: pixels_fill,
      views,
      downloads,
      isNew: status === "new",
    }));
}

export async function getIcon(id: number): Promise<Icon | null> {
  const rows = (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, created_at, updated_at FROM icons WHERE id = ${id}
  `) as Icon[];
  return rows[0] ?? null;
}

/** Any icon by its name, whatever its status. */
export async function getIconByName(name: string): Promise<Icon | null> {
  const rows = (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, created_at, updated_at FROM icons WHERE name = ${name}
  `) as Icon[];
  return rows[0] ?? null;
}

/** A public (new or validated) icon by its name. */
export async function getPublicIconByName(name: string): Promise<Icon | null> {
  const rows = (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, created_at, updated_at FROM icons
    WHERE name = ${name} AND status IN ('new', 'validated')
  `) as Icon[];
  return rows[0] ?? null;
}

/** 1-based rank of a public icon among public icons, oldest first; null when it isn't public. */
export async function getIconPosition(id: number): Promise<{ index: number; total: number } | null> {
  const [row] = await sql`
    SELECT
      (SELECT status FROM icons WHERE id = ${id}) AS status,
      (SELECT count(*) FROM icons WHERE status IN ('new', 'validated') AND id <= ${id})::int AS index,
      (SELECT count(*) FROM icons WHERE status IN ('new', 'validated'))::int AS total
  `;
  return row.status === "new" || row.status === "validated" ? { index: row.index, total: row.total } : null;
}

/** Every alt in use, most used first: suggestions for the tag input. */
export async function listAlts(): Promise<string[]> {
  const rows = await sql`
    SELECT alt FROM icons, unnest(alts) AS alt GROUP BY alt ORDER BY count(*) DESC, alt
  `;
  return rows.map((r) => r.alt as string);
}

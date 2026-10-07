import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Status } from "./status";

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
  updated_at: string;
};

/** All icons, or only those with the given status; most recently updated first. */
export async function listIcons(status?: Status): Promise<Icon[]> {
  return (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, updated_at FROM icons
    WHERE ${status ?? null}::text IS NULL OR status = ${status ?? null}
    ORDER BY updated_at DESC
  `) as Icon[];
}

export async function getIcon(id: number): Promise<Icon | null> {
  const rows = (await sql`
    SELECT id, name, pixels, pixels_fill, status, alts, views, downloads, updated_at FROM icons WHERE id = ${id}
  `) as Icon[];
  return rows[0] ?? null;
}

/** 1-based rank of a validated icon among validated icons, oldest first; null when it isn't validated. */
export async function getIconPosition(id: number): Promise<{ index: number; total: number } | null> {
  const [row] = await sql`
    SELECT
      (SELECT status FROM icons WHERE id = ${id}) AS status,
      (SELECT count(*) FROM icons WHERE status = 'validated' AND id <= ${id})::int AS index,
      (SELECT count(*) FROM icons WHERE status = 'validated')::int AS total
  `;
  return row.status === "validated" ? { index: row.index, total: row.total } : null;
}

/** Every alt in use, most used first: suggestions for the tag input. */
export async function listAlts(): Promise<string[]> {
  const rows = await sql`
    SELECT alt FROM icons, unnest(alts) AS alt GROUP BY alt ORDER BY count(*) DESC, alt
  `;
  return rows.map((r) => r.alt as string);
}

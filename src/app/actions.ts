"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { CELLS, isValidPixels } from "@/lib/pixels";
import { isStatus, type Status } from "@/lib/status";
import { cleanAlts } from "@/lib/alts";
import { toSlug } from "@/lib/slug";
import { assertCanEdit } from "@/lib/editing";
import { reservedReason } from "@/lib/reserved";
import { rebuildKitNow, scheduleKitRebuild } from "@/lib/kitRebuild";

const EMPTY = "0".repeat(CELLS);

function cleanName(name: string) {
  const n = toSlug(name);
  if (!n) throw new Error("Name is required");
  const reserved = reservedReason(n);
  if (reserved) throw new Error(`“${n}” is reserved (${reserved})`);
  return n;
}

/** Names are unique slugs; `except` is the icon being renamed. */
async function assertFreeName(name: string, except?: number) {
  const [row] = await sql`SELECT id FROM icons WHERE name = ${name} AND id IS DISTINCT FROM ${except ?? null}`;
  if (row) throw new Error(`An icon named “${name}” already exists`);
}

/**
 * A request still waiting to be drawn (nothing drawn yet) only holds its name:
 * an icon saved under that name takes its place, keeping the request's alts.
 */
async function findRequest(name: string, except?: number): Promise<{ id: number; alts: string[] } | undefined> {
  const [row] = await sql`
    SELECT id, alts FROM icons
    WHERE name = ${name} AND id IS DISTINCT FROM ${except ?? null}
      AND status = 'requested' AND pixels = ${EMPTY} AND (pixels_fill IS NULL OR pixels_fill = ${EMPTY})
  `;
  return row as { id: number; alts: string[] } | undefined;
}

/** `fill` is null when the icon has no fill variant yet. */
function clean(name: string, pixels: string, fill: string | null, status: Status) {
  if (!isValidPixels(pixels) || (fill !== null && !isValidPixels(fill))) throw new Error("Invalid pixels");
  if (!isStatus(status)) throw new Error("Invalid status");
  if (status === "validated") assertValidatable(pixels, fill);
  return cleanName(name);
}

/** Only icons with both variants drawn can be validated. */
function assertValidatable(pixels: string, fill: string | null) {
  if (pixels === EMPTY) throw new Error("Draw the regular variant before validating");
  if (!fill || fill === EMPTY) throw new Error("Draw the fill variant before validating");
}

function revalidate(id?: number) {
  revalidatePath("/");
  revalidatePath("/icons");
  revalidatePath("/manage");
  if (id) revalidatePath(`/icons/${id}`);
}

type KitFields = { name: string; pixels: string; pixels_fill: string | null; status: string };

/** The kit holds the name and both grids of every validated icon: rebuild it when one of those changes. */
function changesKit(before: KitFields | undefined, after: KitFields | undefined) {
  const inKit = (i?: KitFields) => (i?.status === "validated" ? [i.name, i.pixels, i.pixels_fill].join() : null);
  return inKit(before) !== inKit(after);
}

async function kitFields(id: number): Promise<KitFields | undefined> {
  const [row] = await sql`SELECT name, pixels, pixels_fill, status FROM icons WHERE id = ${id}`;
  return row as KitFields | undefined;
}

/** Live check for the editor: is this slug free, held by an empty request (saving fills it), or used by another icon? */
export async function nameOwner(name: string, except?: number): Promise<"icon" | "request" | null> {
  const n = toSlug(name);
  if (!n) return null;
  if (await findRequest(n, except)) return "request";
  const [row] = await sql`SELECT id FROM icons WHERE name = ${n} AND id IS DISTINCT FROM ${except ?? null}`;
  return row ? "icon" : null;
}

/** Count one view of an icon's popup. Open to everyone; no revalidation, it's only a stat. */
export async function recordView(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  await sql`UPDATE icons SET views = views + 1 WHERE id = ${id} AND status = 'validated'`;
}

/** Count one SVG download of an icon, whatever its style or variant. Open to everyone, like views. */
export async function recordDownload(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  await sql`UPDATE icons SET downloads = downloads + 1 WHERE id = ${id} AND status = 'validated'`;
}

/** Ask for an icon: just a name, to be drawn later. Open to everyone, unlike the other actions. */
export async function requestIcon(name: string): Promise<void> {
  const n = cleanName(name);
  await assertFreeName(n);
  await sql`INSERT INTO icons (name, pixels, status) VALUES (${n}, ${EMPTY}, 'requested')`;
  revalidate();
}

export async function createIcon(
  name: string,
  alts: string[],
  pixels: string,
  fill: string | null,
  status: Status,
): Promise<number> {
  assertCanEdit();
  const n = clean(name, pixels, fill, status);
  const request = await findRequest(n);
  if (!request) await assertFreeName(n);
  const rows = request
    ? await sql`
        UPDATE icons SET alts = ${cleanAlts([...request.alts, ...alts])}, pixels = ${pixels}, pixels_fill = ${fill}, status = ${status}, updated_at = now()
        WHERE id = ${request.id} RETURNING id
      `
    : await sql`
        INSERT INTO icons (name, alts, pixels, pixels_fill, status)
        VALUES (${n}, ${cleanAlts(alts)}, ${pixels}, ${fill}, ${status}) RETURNING id
      `;
  if (status === "validated") scheduleKitRebuild();
  revalidate();
  return rows[0].id as number;
}

export async function updateIcon(
  id: number,
  name: string,
  alts: string[],
  pixels: string,
  fill: string | null,
  status: Status,
): Promise<void> {
  assertCanEdit();
  const n = clean(name, pixels, fill, status);
  // Renaming onto an empty request replaces it.
  const request = await findRequest(n, id);
  if (!request) await assertFreeName(n, id);
  const before = await kitFields(id);
  await sql.transaction([
    sql`DELETE FROM icons WHERE id = ${request?.id ?? null}`,
    sql`
      UPDATE icons SET name = ${n}, alts = ${cleanAlts([...(request?.alts ?? []), ...alts])}, pixels = ${pixels}, pixels_fill = ${fill}, status = ${status}, updated_at = now()
      WHERE id = ${id}
    `,
  ]);
  if (changesKit(before, { name: n, pixels, pixels_fill: fill, status })) scheduleKitRebuild();
  revalidate(id);
}

/**
 * Create a WIP copy of an icon under a free name ("arrow-copy", "arrow-copy-2", …).
 * Takes the editor's current state so unsaved changes are copied too.
 */
export async function duplicateIcon(
  name: string,
  alts: string[],
  pixels: string,
  fill: string | null,
): Promise<number> {
  assertCanEdit();
  const base = `${cleanName(name).replace(/-copy(-\d+)?$/, "")}-copy`;
  const taken = new Set(
    ((await sql`SELECT name FROM icons WHERE name LIKE ${base + "%"}`) as { name: string }[]).map((r) => r.name),
  );
  let copy = base;
  for (let n = 2; taken.has(copy); n++) copy = `${base}-${n}`;
  return createIcon(copy, alts, pixels, fill, pixels === EMPTY ? "requested" : "wip");
}

export async function setIconStatus(id: number, status: Status): Promise<void> {
  assertCanEdit();
  if (!isStatus(status)) throw new Error("Invalid status");
  const before = await kitFields(id);
  if (!before) throw new Error("Icon not found");
  if (status === "validated") assertValidatable(before.pixels, before.pixels_fill);
  await sql`UPDATE icons SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  if (changesKit(before, { ...before, status })) scheduleKitRebuild();
  revalidate(id);
}

export async function deleteIcon(id: number): Promise<void> {
  assertCanEdit();
  const before = await kitFields(id);
  await sql`DELETE FROM icons WHERE id = ${id}`;
  if (changesKit(before, undefined)) scheduleKitRebuild();
  revalidate();
}

/** Send the pending kit rebuild right away instead of waiting for the delay. */
export async function publishKitNow(): Promise<void> {
  assertCanEdit();
  await rebuildKitNow();
  revalidatePath("/manage");
}

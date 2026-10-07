"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { CELLS, isValidPixels } from "@/lib/pixels";
import { isStatus, type Status } from "@/lib/status";
import { cleanAlts } from "@/lib/alts";
import { toSlug } from "@/lib/slug";
import { assertCanEdit } from "@/lib/editing";
import { reservedReason } from "@/lib/reserved";

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

/** Live check for the editor: is this slug used by another icon? */
export async function isNameTaken(name: string, except?: number): Promise<boolean> {
  const n = toSlug(name);
  if (!n) return false;
  const [row] = await sql`SELECT id FROM icons WHERE name = ${n} AND id IS DISTINCT FROM ${except ?? null}`;
  return !!row;
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
  await assertFreeName(n);
  const rows = await sql`
    INSERT INTO icons (name, alts, pixels, pixels_fill, status)
    VALUES (${n}, ${cleanAlts(alts)}, ${pixels}, ${fill}, ${status}) RETURNING id
  `;
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
  await assertFreeName(n, id);
  await sql`
    UPDATE icons SET name = ${n}, alts = ${cleanAlts(alts)}, pixels = ${pixels}, pixels_fill = ${fill}, status = ${status}, updated_at = now()
    WHERE id = ${id}
  `;
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
  if (status === "validated") {
    const [row] = await sql`SELECT pixels, pixels_fill FROM icons WHERE id = ${id}`;
    if (!row) throw new Error("Icon not found");
    assertValidatable(row.pixels, row.pixels_fill);
  }
  await sql`UPDATE icons SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  revalidate(id);
}

export async function deleteIcon(id: number): Promise<void> {
  assertCanEdit();
  await sql`DELETE FROM icons WHERE id = ${id}`;
  revalidate();
}

"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { CELLS, isValidPixels } from "@/lib/pixels";
import { isStatus, type Status } from "@/lib/status";
import { cleanAlts } from "@/lib/alts";
import { toSlug } from "@/lib/slug";
import { assertCanEdit } from "@/lib/editing";
import { reservedReason } from "@/lib/reserved";
import { publishKit } from "@/lib/kitPublish";

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
  if (status === "ready" || status === "validated") assertDrawn(pixels, fill);
  return cleanName(name);
}

/** Only icons with both variants drawn can be marked ready (and so validated). */
function assertDrawn(pixels: string, fill: string | null) {
  if (pixels === EMPTY) throw new Error("Draw the regular variant before marking it ready");
  if (!fill || fill === EMPTY) throw new Error("Draw the fill variant before marking it ready");
}

/** Icons only become validated by publishing the kit; one that already is can stay so. */
function assertNotPublishing(status: Status, before?: { status: string }) {
  if (status === "validated" && before?.status !== "validated")
    throw new Error("Icons can’t be validated directly any more: use “Mark ready”, then “Publish the kit” on /manage");
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/icons");
  revalidatePath("/manage");
  // Icon pages show their neighbours too: refresh them all.
  revalidatePath("/icons/[name]", "page");
}

async function iconState(id: number) {
  const [row] = await sql`SELECT pixels, pixels_fill, status FROM icons WHERE id = ${id}`;
  return row as { pixels: string; pixels_fill: string | null; status: string } | undefined;
}

/** Live check for the editor: is this slug free, held by an empty request (saving fills it), or used by another icon? */
export async function nameOwner(name: string, except?: number): Promise<"icon" | "request" | null> {
  const n = toSlug(name);
  if (!n) return null;
  if (await findRequest(n, except)) return "request";
  const [row] = await sql`SELECT id FROM icons WHERE name = ${n} AND id IS DISTINCT FROM ${except ?? null}`;
  return row ? "icon" : null;
}

/** Crawlers, previewers and headless browsers: they run the page's script too, but aren't people. */
const BOT = /bot|crawl|spider|slurp|scrap|preview|fetch|headless|lighthouse|inspect|facebookexternalhit|embedly|curl|wget|python|^$/i;

const fromBot = async () => BOT.test((await headers()).get("user-agent") ?? "");

/** Count one view of an icon, in the popup or on its page. Open to everyone; no revalidation, it's only a stat. */
export async function recordView(id: number): Promise<void> {
  if (!Number.isInteger(id) || (await fromBot())) return;
  await sql`UPDATE icons SET views = views + 1 WHERE id = ${id} AND status = 'validated'`;
}

/** Count one SVG download of an icon, whatever its style or variant. Open to everyone, like views. */
export async function recordDownload(id: number): Promise<void> {
  if (!Number.isInteger(id) || (await fromBot())) return;
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
  assertNotPublishing(status);
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
  assertNotPublishing(status, await iconState(id));
  const request = await findRequest(n, id);
  if (!request) await assertFreeName(n, id);
  await sql.transaction([
    sql`DELETE FROM icons WHERE id = ${request?.id ?? null}`,
    sql`
      UPDATE icons SET name = ${n}, alts = ${cleanAlts([...(request?.alts ?? []), ...alts])}, pixels = ${pixels}, pixels_fill = ${fill}, status = ${status}, updated_at = now()
      WHERE id = ${id}
    `,
  ]);
  revalidate();
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
): Promise<string> {
  assertCanEdit();
  const base = `${cleanName(name).replace(/-copy(-\d+)?$/, "")}-copy`;
  const taken = new Set(
    ((await sql`SELECT name FROM icons WHERE name LIKE ${base + "%"}`) as { name: string }[]).map((r) => r.name),
  );
  let copy = base;
  for (let n = 2; taken.has(copy); n++) copy = `${base}-${n}`;
  await createIcon(copy, alts, pixels, fill, pixels === EMPTY ? "requested" : "wip");
  return copy;
}

export async function setIconStatus(id: number, status: Status): Promise<void> {
  assertCanEdit();
  if (!isStatus(status)) throw new Error("Invalid status");
  const before = await iconState(id);
  if (!before) throw new Error("Icon not found");
  assertNotPublishing(status, before);
  if (status === "ready") assertDrawn(before.pixels, before.pixels_fill);
  await sql`UPDATE icons SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  revalidate();
}

export async function deleteIcon(id: number): Promise<void> {
  assertCanEdit();
  await sql`DELETE FROM icons WHERE id = ${id}`;
  revalidate();
}

/** Put the ready icons online and rebuild the kit with them: the only thing that redeploys the site. */
export async function publishKitNow(): Promise<void> {
  assertCanEdit();
  await publishKit();
  revalidate();
}

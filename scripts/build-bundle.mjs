// Builds the paid bundle: every validated icon, in every style and variant, as SVG and as 512 px PNG, zipped.
//   pixicons/svg/<style>/<variant>/<name>_<variant>_<style>.svg
//   pixicons/png/<style>/<variant>/<name>_<variant>_<style>.png
// With --upload (and BLOB_READ_WRITE_TOKEN), the zip replaces the one in the private Blob store, unless the icons
// haven't changed since it was made. Pass --out=path.zip to keep the zip somewhere.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateSync } from "node:zlib";
import { build } from "esbuild";
import { neon } from "@neondatabase/serverless";
import { Resvg } from "@resvg/resvg-js";

const PNG_SIZE = 512;
/** Where the zip lives in the Blob store; the download route asks for this path. */
const BLOB_PATH = "bundle/pixicons.zip";
/**
 * A black-on-transparent PNG from resvg's RGBA pixels, as grey + alpha: the colour is the same everywhere, so storing
 * only the coverage makes each file less than half the size of resvg's own RGBA PNG, for the same image.
 */
function blackPng({ pixels, width, height }) {
  const raw = Buffer.alloc(height * (1 + width * 2)); // per row: filter byte 0, then (grey 0, alpha) pairs
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) raw[y * (1 + width * 2) + 1 + x * 2 + 1] = pixels[(y * width + x) * 4 + 3];
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 4; // grey + alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const upload = process.argv.includes("--upload");
const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);

// The drawing code is TypeScript with extensionless imports: bundle it for Node first.
const work = mkdtempSync(join(tmpdir(), "pixicons-bundle-"));
await build({
  entryPoints: ["src/lib/bundleFiles.ts"],
  outfile: join(work, "lib.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "warning",
});
const { STYLES, VARIANTS, decode, iconSvg, bundleFileName } = await import(pathToFileURL(join(work, "lib.mjs")).href);

const sql = neon(process.env.DATABASE_URL);
const icons = await sql`SELECT name, pixels, pixels_fill FROM icons WHERE status = 'validated' ORDER BY name`;

// The bundle only changes with the icons (and the drawing code, which a deploy of this script carries).
const version = createHash("sha256")
  .update(JSON.stringify(icons))
  .update(readFileSync("src/lib/svg.ts"))
  .digest("hex")
  .slice(0, 16);

let store = null;
if (upload) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  store = await import("@vercel/blob");
  const uploaded = await store.head(`bundle/${version}.version`).catch(() => null);
  if (uploaded && (await store.head(BLOB_PATH).catch(() => null))) {
    console.log(`bundle ${version} is up to date`);
    process.exit(0);
  }
}

const started = Date.now();
const root = join(work, "pixicons");
let files = 0;
for (const style of STYLES) {
  for (const variant of VARIANTS) {
    const svgDir = join(root, "svg", style.id, variant.id);
    const pngDir = join(root, "png", style.id, variant.id);
    mkdirSync(svgDir, { recursive: true });
    mkdirSync(pngDir, { recursive: true });
    for (const icon of icons) {
      const pixels = variant.id === "fill" ? icon.pixels_fill : icon.pixels;
      if (!pixels) continue;
      const grid = decode(pixels);
      const name = bundleFileName(icon.name, variant.id, style.id);
      writeFileSync(join(svgDir, `${name}.svg`), iconSvg(grid, style.id));
      // PNGs have no text around them to take a colour from: black on transparent.
      // No text to draw: skipping the system fonts makes each render ~60× faster.
      const png = blackPng(
        new Resvg(iconSvg(grid, style.id, { size: PNG_SIZE, color: "#000" }), { font: { loadSystemFonts: false } }).render(),
      );
      writeFileSync(join(pngDir, `${name}.png`), png);
      files += 2;
    }
  }
  console.log(`${style.id}: done (${Math.round((Date.now() - started) / 1000)}s)`);
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(root, "README.txt"),
  `Pixicons · the full bundle
${icons.length} pixel icons, ${STYLES.length} styles, 2 variants (regular and fill), as SVG and as ${PNG_SIZE} px PNG.
Made on ${date}. Your download link always serves the latest bundle, with every icon added since.

svg/<style>/<variant>/<icon>_<variant>_<style>.svg
  Vector files. They take the colour of the text around them (currentColor), and are black anywhere else.
png/<style>/<variant>/<icon>_<variant>_<style>.png
  ${PNG_SIZE}×${PNG_SIZE} px, black on transparent.

Browse, tweak colours and copy the HTML at https://www.pixicons.io
The icons are under the MIT licence: see LICENSE.txt.
`,
);
writeFileSync(join(root, "LICENSE.txt"), readFileSync("packages/pixiconsio/LICENSE"));

const zip = out ?? join(work, "pixicons.zip");
execFileSync("zip", ["-q", "-r", "-X", zip, "pixicons"], { cwd: work });
const mb = (statSync(zip).size / 1e6).toFixed(1);
console.log(`bundle ${version}: ${icons.length} icons, ${files} files, ${mb} MB, ${Math.round((Date.now() - started) / 1000)}s`);

if (store) {
  await store.put(BLOB_PATH, readFileSync(zip), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/zip",
    multipart: true, // ~250 MB: sent in parts
  });
  // A marker per version, so the next run knows this one is already up.
  await store.put(`bundle/${version}.version`, date, { access: "private", addRandomSuffix: false, allowOverwrite: true });
  console.log(`uploaded to ${BLOB_PATH}`);
}

rmSync(root, { recursive: true, force: true });
if (!out) rmSync(work, { recursive: true, force: true });

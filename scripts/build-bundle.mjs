// Builds the paid bundle: every validated icon, in every style and variant, as SVG and as 512 px PNG, zipped.
//   pixicons/svg/<style>/<variant>/<name>_<variant>_<style>.svg
//   pixicons/png/<style>/<variant>/<name>_<variant>_<style>.png
//
// Incremental: the drawn files, the zip and a manifest of what they hold stay in a cache folder (--cache=dir,
// .bundle-cache by default; GitHub Actions keeps it between runs). Each run only draws the icons that are new or
// changed, removes the files of the ones that are gone, and syncs the zip. A change to the drawing code redraws all.
//
// Each style is drawn in its own process: resvg keeps the memory of its renders (2–3 GB per few thousand), which
// got the whole run killed on GitHub's runners. A process per style hands it all back when it exits.
//
// With --upload (and BLOB_READ_WRITE_TOKEN), the zip replaces the one in the private Blob store, unless the icons
// haven't changed since it was made. Pass --out=path.zip to also copy the zip somewhere.
import { execFileSync, fork } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crc32, deflateSync } from "node:zlib";

const PNG_SIZE = 512;
/** Where the zip lives in the Blob store; the download route asks for this path. */
const BLOB_PATH = "bundle/pixicons.zip";
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const sha = (...parts) => {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest("hex").slice(0, 16);
};

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

// ---- Child: draw one style's files for the given icons, then exit (and free resvg's memory). ----
if (process.argv.includes("--child")) {
  const { lib, root, style, icons } = JSON.parse(readFileSync(arg("job"), "utf8"));
  const { Resvg } = await import("@resvg/resvg-js");
  const { VARIANTS, decode, iconSvg, bundleFileName } = await import(pathToFileURL(lib).href);
  for (const variant of VARIANTS) {
    const svgDir = join(root, "svg", style, variant.id);
    const pngDir = join(root, "png", style, variant.id);
    mkdirSync(svgDir, { recursive: true });
    mkdirSync(pngDir, { recursive: true });
    for (const icon of icons) {
      const pixels = variant.id === "fill" ? icon.pixels_fill : icon.pixels;
      if (!pixels) continue;
      const grid = decode(pixels);
      const name = bundleFileName(icon.name, variant.id, style);
      writeFileSync(join(svgDir, `${name}.svg`), iconSvg(grid, style));
      // PNGs have no text around them to take a colour from: black on transparent.
      // No text to draw: skipping the system fonts makes each render ~60× faster.
      const png = blackPng(
        new Resvg(iconSvg(grid, style, { size: PNG_SIZE, color: "#000" }), { font: { loadSystemFonts: false } }).render(),
      );
      writeFileSync(join(pngDir, `${name}.png`), png);
    }
  }
  process.exit(0);
}

// ---- Parent ----
const { build } = await import("esbuild");
const { neon } = await import("@neondatabase/serverless");

const upload = process.argv.includes("--upload");
const out = arg("out");
const cache = resolve(arg("cache") ?? ".bundle-cache");
const root = join(cache, "pixicons");
const zip = join(cache, "pixicons.zip");
const manifestPath = join(cache, "manifest.json");

const sql = neon(process.env.DATABASE_URL);
const icons = await sql`SELECT name, pixels, pixels_fill FROM icons WHERE status IN ('new', 'validated') ORDER BY name`;

// The bundle only changes with the icons (and the drawing code, which a deploy of this script carries).
const version = sha(JSON.stringify(icons), readFileSync("src/lib/svg.ts"));

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
const seconds = () => Math.round((Date.now() - started) / 1000);

// The drawing code is TypeScript with extensionless imports: bundle it for Node first.
const work = mkdtempSync(join(tmpdir(), "pixicons-bundle-"));
const lib = join(work, "lib.mjs");
await build({
  entryPoints: ["src/lib/bundleFiles.ts"],
  outfile: lib,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "warning",
});
const { STYLES, VARIANTS, bundleFileName } = await import(pathToFileURL(lib).href);

// What the cached files were drawn from: the drawing code, and each icon's grids.
const code = sha(readFileSync(lib), readFileSync(fileURLToPath(import.meta.url)));
const iconHash = (i) => sha(i.pixels, i.pixels_fill ?? "");
let manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
if (!manifest || manifest.code !== code || !existsSync(zip)) {
  console.log(manifest ? "drawing code changed: redrawing everything" : "no cache: drawing everything");
  rmSync(cache, { recursive: true, force: true });
  manifest = { code, icons: {} };
}
mkdirSync(root, { recursive: true });

const current = new Map(icons.map((i) => [i.name, iconHash(i)]));
const changed = icons.filter((i) => manifest.icons[i.name] !== current.get(i.name));
const gone = Object.keys(manifest.icons).filter((name) => current.get(name) !== manifest.icons[name]);

// Clear the files of icons that are gone or redrawn (a redrawn one may have lost its fill variant).
for (const name of gone)
  for (const style of STYLES)
    for (const variant of VARIANTS)
      for (const ext of ["svg", "png"])
        rmSync(join(root, ext, style.id, variant.id, `${bundleFileName(name, variant.id, style.id)}.${ext}`), { force: true });
console.log(`${icons.length} icons: ${changed.length} to draw, ${Object.keys(manifest.icons).filter((n) => !current.has(n)).length} removed`);

if (changed.length) {
  // A few styles at a time, each in its own process (see the top of this file for why): up to ~3 GB each.
  const jobs = STYLES.map((style) => style.id);
  const parallel = Math.max(1, Math.min(3, availableParallelism() - 1, Math.floor(totalmem() / 4e9)));
  const draw = (style) =>
    new Promise((ok, fail) => {
      const job = join(work, `${style}.json`);
      writeFileSync(job, JSON.stringify({ lib, root, style, icons: changed }));
      fork(fileURLToPath(import.meta.url), ["--child", `--job=${job}`]).on("exit", (status, signal) =>
        status === 0 ? (console.log(`${style}: done (${seconds()}s)`), ok()) : fail(new Error(`${style}: drawing failed (${signal ?? status})`)),
      );
    });
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      while (queue.length) await draw(queue.shift());
    }),
  );
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

// -FS syncs the zip with the folder: adds and replaces what changed, drops what's gone, keeps the rest as is.
execFileSync("zip", ["-q", "-r", "-X", "-FS", zip, "pixicons"], { cwd: cache });
writeFileSync(manifestPath, JSON.stringify({ code, icons: Object.fromEntries(current) }));
const size = readFileSync(zip).length;
console.log(`bundle ${version}: ${icons.length} icons, ${(size / 1e6).toFixed(1)} MB, ${seconds()}s`);
if (out) copyFileSync(zip, out);

if (store) {
  await store.put(BLOB_PATH, readFileSync(zip), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/zip",
    multipart: true, // ~270 MB: sent in parts
  });
  // A marker per version, so the next run knows this one is already up.
  await store.put(`bundle/${version}.version`, date, { access: "private", addRandomSuffix: false, allowOverwrite: true });
  console.log(`uploaded to ${BLOB_PATH}`);
}

rmSync(work, { recursive: true, force: true });

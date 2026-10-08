// Builds public/kit/pixicons.js: the kit runtime (src/kit/pixicons.ts) with every validated icon inlined as hex grids.
import { build } from "esbuild";
import { neon } from "@neondatabase/serverless";
import { toHex } from "../src/lib/pixels.ts";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT name, pixels, pixels_fill FROM icons WHERE status = 'validated' ORDER BY name`;
const icons = Object.fromEntries(rows.map((r) => [r.name, [toHex(r.pixels), r.pixels_fill ? toHex(r.pixels_fill) : null]]));

await build({
  entryPoints: ["src/kit/pixicons.ts"],
  outfile: "public/kit/pixicons.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2018",
  define: { __PIXCON_ICONS__: JSON.stringify(icons) },
  banner: { js: `/*! Pixicons kit · ${rows.length} icons · https://www.pixicons.io/ */` },
  logLevel: "warning",
});
console.log(`kit ready: ${rows.length} icons → public/kit/pixicons.js`);

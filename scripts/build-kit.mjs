// Builds public/kit/pixcon.js: the kit runtime (src/kit/pixcon.ts) with every validated icon inlined as hex grids.
import { build } from "esbuild";
import { neon } from "@neondatabase/serverless";
import { toHex } from "../src/lib/pixels.ts";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT name, pixels, pixels_fill FROM icons WHERE status = 'validated' ORDER BY name`;
const icons = Object.fromEntries(rows.map((r) => [r.name, [toHex(r.pixels), r.pixels_fill ? toHex(r.pixels_fill) : null]]));

await build({
  entryPoints: ["src/kit/pixcon.ts"],
  outfile: "public/kit/pixcon.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2018",
  define: { __PIXCON_ICONS__: JSON.stringify(icons) },
  banner: { js: `/*! Pixcon kit · ${rows.length} icons · https://pixcon.vercel.app/ */` },
  logLevel: "warning",
});
console.log(`kit ready: ${rows.length} icons → public/kit/pixcon.js`);

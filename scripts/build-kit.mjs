// Builds public/kit/pixicons.js: the kit runtime (src/kit/pixicons.ts) with every validated icon inlined as hex grids.
import { build } from "esbuild";
import { neon } from "@neondatabase/serverless";
import { toHex } from "../src/lib/pixels.ts";
import { kitHash } from "../src/lib/kitVersion.ts";

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

// A production deploy now serves this kit: record what it holds, so /manage can tell when it falls behind.
if (process.env.VERCEL_ENV === "production") {
  try {
    await sql`
      INSERT INTO kit_state (id, built_hash, built_at) VALUES (true, ${kitHash(rows)}, now())
      ON CONFLICT (id) DO UPDATE SET built_hash = EXCLUDED.built_hash, built_at = EXCLUDED.built_at
    `;
  } catch (e) {
    console.warn(`kit state not recorded (run npm run db:init): ${e.message}`);
  }
}

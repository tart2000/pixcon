import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/** Gzipped size of the built kit in KB (what browsers download), or null before `npm run build:kit` has run. */
export function kitSizeKB(): number | null {
  try {
    return Math.ceil(gzipSync(readFileSync(join(process.cwd(), "public/kit/pixcon.js"))).length / 1024);
  } catch {
    return null;
  }
}

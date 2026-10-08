import "server-only";
import { statSync } from "node:fs";
import { join } from "node:path";

/** Size of the built kit file in KB (rounded up, like a file browser shows it), or null before `npm run build:kit` has run. */
export function kitSizeKB(): number | null {
  try {
    return Math.ceil(statSync(join(process.cwd(), "public/kit/pixicons.js")).size / 1000);
  } catch {
    return null;
  }
}

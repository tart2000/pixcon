import "server-only";
import { sql } from "@/lib/db";
import { kitHash } from "@/lib/kitVersion";

/**
 * The kit is built from the database when the site deploys (see scripts/build-kit.mjs), and the site only
 * redeploys when someone presses "Publish the kit" on /manage: that publishes the ready icons and calls the
 * Vercel Deploy Hook, once.
 */
export type KitStatus = {
  /** Icons marked ready, waiting to go live. */
  ready: number;
  /** Public icons changed (drawn, renamed, unvalidated, deleted) since the live kit was built. */
  stale: boolean;
  /** A build was asked for and hasn't finished yet. */
  building: boolean;
};

export async function kitStatus(): Promise<KitStatus> {
  const [validated, [counts], [state]] = await Promise.all([
    sql`SELECT name, pixels, pixels_fill FROM icons WHERE status IN ('new', 'validated')`,
    sql`SELECT count(*) FILTER (WHERE status = 'ready')::int AS ready FROM icons`,
    sql`SELECT built_hash, built_at, requested_at FROM kit_state WHERE id`.catch(() => []),
  ]);
  const built = state?.built_hash as string | null | undefined;
  const building = !!state?.requested_at && (!state.built_at || state.requested_at > state.built_at);
  return {
    ready: counts.ready as number,
    // Unknown until a production build records what it holds. While a build runs, the live kit is the previous one
    // and the icons just published differ from it: that's what the build is for, not a change to publish again.
    stale: !building && !!built && built !== kitHash(validated as Parameters<typeof kitHash>[0]),
    building,
  };
}

/**
 * Go live: last batch's new icons become validated and the ready ones become new, in one statement, then redeploy so
 * the kit (and npm, and the bundle) follow.
 */
export async function publishKit(): Promise<void> {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) throw new Error("VERCEL_DEPLOY_HOOK is not set");
  await sql`
    UPDATE icons SET status = CASE status WHEN 'new' THEN 'validated' ELSE 'new' END, updated_at = now()
    WHERE status IN ('new', 'ready')
  `;
  const res = await fetch(hook, { method: "POST" });
  if (!res.ok) throw new Error(`The deploy hook answered HTTP ${res.status}`);
  await sql`UPDATE kit_state SET requested_at = now() WHERE id`;
}

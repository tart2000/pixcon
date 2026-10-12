import "server-only";

/**
 * The kit is built from the database when the site deploys (see scripts/build-kit.mjs).
 * After a change to what it contains, we redeploy through a Vercel Deploy Hook, a little
 * after the last change so a batch of validations triggers a single build.
 */
const DELAY = 2 * 60_000;

// Kept on globalThis so the pending rebuild survives the dev server reloading this module.
const state = ((globalThis as { __kitRebuild?: { timer?: ReturnType<typeof setTimeout>; due: number | null } })
  .__kitRebuild ??= { due: null });

/**
 * The pending rebuild, if any: `at` is when it will be sent (ms timestamp),
 * or null when sending it failed and it waits to be published by hand.
 */
export const pendingKitRebuild = (): { at: number | null } | null =>
  state.due === null ? null : { at: state.timer ? state.due : null };

export function scheduleKitRebuild() {
  if (!process.env.VERCEL_DEPLOY_HOOK) return;
  clearTimeout(state.timer);
  state.due = Date.now() + DELAY;
  state.timer = setTimeout(() => void rebuildKitNow(), DELAY);
}

export async function rebuildKitNow() {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  clearTimeout(state.timer);
  state.timer = undefined;
  state.due = null;
  if (!hook) return;
  try {
    const res = await fetch(hook, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("kit rebuild: deploy triggered");
  } catch (e) {
    console.error("kit rebuild: deploy hook failed", e);
    // Still pending: /manage keeps offering to send it.
    state.due = 0;
  }
}

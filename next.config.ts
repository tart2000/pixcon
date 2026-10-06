import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/** Set by the GitHub Pages workflow: a static export served from /pixcon. */
const pages = process.env.GITHUB_PAGES === "true";

export default function config(phase: string): NextConfig {
  return {
    // Drawing pages (`page.edit.tsx`) only exist on the local dev server.
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["edit.tsx", "tsx", "ts"] : ["tsx", "ts"],
    env: { STATIC_EXPORT: pages ? "1" : "" },
    ...(pages && {
      output: "export",
      basePath: "/pixcon",
      trailingSlash: true,
      // No server, so no Server Actions: requests open a GitHub issue instead.
      turbopack: { resolveAlias: { "@/app/actions": "./src/app/actions.static.ts" } },
    }),
  };
}

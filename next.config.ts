import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    // Drawing pages (`page.edit.tsx`) only exist on the local dev server.
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["edit.tsx", "tsx", "ts"] : ["tsx", "ts"],
    // Native addon rendering the merch print files; load it from node_modules instead of bundling it.
    serverExternalPackages: ["@resvg/resvg-js"],
    // Read from disk by the icons' share images: ship them with that function.
    outputFileTracingIncludes: { "/icons/[name]/opengraph-image": ["./src/assets/*.ttf", "./src/app/icon.svg"] },
  };
}

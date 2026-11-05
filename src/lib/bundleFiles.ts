// What scripts/build-bundle.mjs needs to draw the bundle's files, in one entry point it can compile.
export { STYLES, iconSvg } from "./svg";
export { VARIANTS, decode } from "./pixels";

/** A bundle file's name, without extension: the icon, its variant and its style, e.g. `heart_fill_liquid-blob`. */
export const bundleFileName = (icon: string, variant: string, style: string) => `${icon}_${variant}_${style}`;

import type { Variant } from "./pixels";
import type { StyleId } from "./svg";

/** Public URL of the kit (built by scripts/build-kit.mjs, served with the site). */
export const KIT_URL = "https://tart2000.github.io/pixcon/kit/pixcon.js";

export const KIT_SCRIPT = `<script src="${KIT_URL}"></script>`;

/** The markup the kit turns into an icon. */
export const kitTag = (name: string, style: StyleId, variant: Variant) =>
  `<i class="px px-${name} px-${style} px-${variant}"></i>`;

import type { Variant } from "./pixels";
import type { StyleId } from "./svg";

/** Public URL of the kit (built by scripts/build-kit.mjs, served with the site). */
export const KIT_URL = "https://www.pixicons.io/kit/pixicons.js";

export const KIT_SCRIPT = `<script src="${KIT_URL}"></script>`;

/** The same kit mirrored on npm as `pixiconsio` (scripts/publish-kit.mjs), served by jsDelivr. */
export const KIT_CDN_URL = "https://cdn.jsdelivr.net/npm/pixiconsio@1/pixicons.js";

/** The markup the kit turns into an icon. */
export const kitTag = (name: string, style: StyleId, variant: Variant) =>
  `<i class="px px-${name} px-${style} px-${variant}"></i>`;

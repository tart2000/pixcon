import type { Variant } from "./pixels";
import type { StyleId } from "./svg";

/**
 * The URL we hand out: the kit published on npm as `pixiconsio` (scripts/publish-kit.mjs), served by jsDelivr.
 * `@latest` so sites get new icons without changing their tag.
 */
export const KIT_URL = "https://cdn.jsdelivr.net/npm/pixiconsio@latest/pixicons.js";

export const KIT_SCRIPT = `<script src="${KIT_URL}"></script>`;

/** The markup the kit turns into an icon. */
export const kitTag = (name: string, style: StyleId, variant: Variant) =>
  `<i class="px px-${name} px-${style} px-${variant}"></i>`;

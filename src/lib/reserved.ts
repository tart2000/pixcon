import { VARIANTS } from "./pixels";
import { STYLES } from "./svg";

/** Kit modifiers kept free for later (sizes, animation…). */
const MODIFIERS = ["xs", "sm", "lg", "xl", "2x", "3x", "spin", "fw"];

/**
 * Names an icon can't take: the kit reads every `px-*` class, so `px-blob` must always
 * mean the Blob style, never an icon called "blob". Keep scripts/init-db.mjs in sync.
 */
const RESERVED = new Map<string, string>([
  ...STYLES.map((s) => [s.id, "style name"] as const),
  ...VARIANTS.map((v) => [v.id, "variant name"] as const),
  ...MODIFIERS.map((m) => [m, "kit modifier"] as const),
]);

export const RESERVED_NAMES = [...RESERVED.keys()];

/** Why a name is reserved ("style name"…), or null when it's free to use. */
export const reservedReason = (name: string) => RESERVED.get(name) ?? null;

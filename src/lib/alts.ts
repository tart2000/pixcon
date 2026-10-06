/** Alts are alternative names (tags) that make an icon findable, e.g. "love" for heart. */
export const MAX_ALTS = 20;

export const normalizeAlt = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);

/** Normalised, de-duplicated, capped list. */
export const cleanAlts = (alts: string[]) => [...new Set(alts.map(normalizeAlt).filter(Boolean))].slice(0, MAX_ALTS);

/** Search match on the name or any alt. */
export function matchesQuery(icon: { name: string; alts: string[] }, query: string) {
  const q = query.trim().toLowerCase();
  return !q || icon.name.toLowerCase().includes(q) || icon.alts.some((a) => a.includes(q));
}

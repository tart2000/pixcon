/** Icon names are slugs: lowercase a–z, digits and single dashes, e.g. "arrow-right". */
export const MAX_SLUG = 64;

/** Slug while typing: invalid characters become dashes, but a trailing dash is kept so "arrow-" can become "arrow-right". */
export const typingSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, MAX_SLUG);

/** Final slug: like `typingSlug`, without dangling dashes. */
export const toSlug = (s: string) => typingSlug(s).replace(/-+$/, "");

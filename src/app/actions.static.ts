import type { Status } from "@/lib/status";
import { toSlug } from "@/lib/slug";

/**
 * Stand-ins for `actions.ts` in the static GitHub Pages export (see next.config.ts),
 * which has no server: a request opens a prefilled GitHub issue.
 */
export async function requestIcon(name: string): Promise<void> {
  const title = `Icon request: ${toSlug(name)}`;
  const body = `Please draw a \`${toSlug(name)}\` icon.`;
  window.open(
    `https://github.com/tart2000/pixcon/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`,
    "_blank",
    "noopener",
  );
}

/** No server to count views on in the static export. */
export async function recordView(): Promise<void> {}

export const setIconStatus: (id: number, status: Status) => Promise<void> = async () => {
  throw new Error("Editing is disabled");
};

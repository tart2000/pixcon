/**
 * Icon workflow: someone requests a name, someone draws it, it's marked ready, then publishing the kit makes it new.
 * The next publish turns it validated, as the following batch becomes new. New and validated icons are public (site,
 * kit, bundle): they go live together, when the kit is published; new ones get a badge in the library.
 */
export const STATUSES = [
  { id: "requested", label: "Requested", dot: "bg-neutral-400" },
  { id: "wip", label: "WIP", dot: "bg-amber-500" },
  { id: "ready", label: "Ready", dot: "bg-sky-500" },
  { id: "new", label: "New", dot: "bg-fuchsia-500" },
  { id: "validated", label: "Validated", dot: "bg-emerald-500" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

export const isStatus = (s: unknown): s is Status => STATUSES.some((x) => x.id === s);

/** Statuses shown to everyone: the latest batch (new) and the ones before it (validated). */
export const PUBLIC_STATUSES = ["new", "validated"] as const satisfies Status[];
export const isPublic = (s: string) => (PUBLIC_STATUSES as readonly string[]).includes(s);

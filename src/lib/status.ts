/** Icon workflow: someone requests a name, someone draws it, then it gets validated. */
export const STATUSES = [
  { id: "requested", label: "Requested", dot: "bg-neutral-400" },
  { id: "wip", label: "WIP", dot: "bg-amber-500" },
  { id: "validated", label: "Validated", dot: "bg-emerald-500" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

export const isStatus = (s: unknown): s is Status => STATUSES.some((x) => x.id === s);

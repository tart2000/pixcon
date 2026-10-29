"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { requestIcon, setIconStatus } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/status";
import { IconGlyph } from "./IconGlyph";
import { matchesQuery } from "@/lib/alts";
import { toSlug, typingSlug } from "@/lib/slug";
import { canEdit } from "@/lib/editing";
import { reservedReason } from "@/lib/reserved";
import { Segmented } from "./Segmented";

type Item = {
  id: number;
  name: string;
  alts: string[];
  pixels: string;
  fill: string | null;
  status: Status;
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
};

/** Sort orders for the local editor; the last column shows the value being sorted on. */
const SORTS = [
  { id: "updated", label: "Updated" },
  { id: "created", label: "Created" },
  { id: "views", label: "Views" },
  { id: "downloads", label: "Downloads" },
  { id: "name", label: "Name" },
] as const;

type Sort = (typeof SORTS)[number]["id"];

const compare: Record<Sort, (a: Item, b: Item) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  created: (a, b) => b.createdAt.localeCompare(a.createdAt),
  views: (a, b) => b.views - a.views,
  downloads: (a, b) => b.downloads - a.downloads,
  name: (a, b) => a.name.localeCompare(b.name),
};

const isBlank = (pixels: string | null) => !pixels || !pixels.includes("1");

/** `initialQuery` prefills the search-or-request field, e.g. from a search that found nothing on /icons. */
export function ManageList({ icons, initialQuery = "" }: { icons: Item[]; initialQuery?: string }) {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [sort, setSort] = useState<Sort>("updated");
  // One field to both search and request: typing filters the list, so duplicates show up before asking.
  const [request, setRequest] = useState(initialQuery);
  const [requested, setRequested] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: icons.length };
    for (const s of STATUSES) c[s.id] = icons.filter((i) => i.status === s.id).length;
    return c;
  }, [icons]);

  const rows = useMemo(() => {
    return icons
      .filter((i) => (filter === "all" || i.status === filter) && matchesQuery(i, request))
      .sort(compare[sort]);
  }, [icons, filter, request, sort]);
  // Name sorting has nothing to show in the last column: keep the update date there.
  const column = sort === "name" ? "updated" : sort;

  const slug = toSlug(request);
  const existing = slug ? icons.find((i) => i.name === slug) : undefined;
  const reserved = slug ? reservedReason(slug) : null;

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  const submitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || existing || reserved) return;
    run(async () => {
      await requestIcon(slug);
      setRequest("");
      setRequested(slug);
      setTimeout(() => setRequested((r) => (r === slug ? null : r)), 2500);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submitRequest} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="input flex-1 font-mono sm:max-w-sm"
            placeholder="Search or request an icon, e.g. calendar"
            aria-label="Search or request an icon"
            value={request}
            maxLength={64}
            onChange={(e) => {
              setRequest(typingSlug(e.target.value));
              setRequested(null);
            }}
          />
          <button className="btn-primary" disabled={!slug || !!existing || !!reserved || pending}>
            Request
          </button>
        </div>
        {reserved ? (
          <p className="text-sm text-muted">
            <span className="font-mono text-foreground">{slug}</span> is reserved ({reserved}), pick another name.
          </p>
        ) : existing ? (
          <p className="text-sm text-muted">
            <span className="font-mono text-foreground">{existing.name}</span> already exists ·{" "}
            {STATUSES.find((s) => s.id === existing.status)!.label}
          </p>
        ) : requested ? (
          <p className="text-sm text-muted">
            Requested <span className="font-mono text-foreground">{requested}</span> ✓
          </p>
        ) : null}
      </form>

      {/* Small screens: both controls collapse into native selects. */}
      <div className="flex flex-wrap gap-2 sm:hidden">
        <Select
          label="Status"
          value={filter}
          onChange={setFilter}
          dot={STATUSES.find((s) => s.id === filter)?.dot}
          options={[{ id: "all" as const, label: "All" }, ...STATUSES].map((s) => ({
            id: s.id,
            label: `${s.label} (${counts[s.id]})`,
          }))}
        />
        {canEdit && (
          <Select label="Sort by" value={sort} onChange={setSort} options={SORTS.map((s) => ({ ...s, label: `Sort: ${s.label}` }))} />
        )}
      </div>

      <div className="hidden items-center justify-between gap-3 sm:flex">
        <div className="flex flex-wrap gap-1">
          {[{ id: "all" as const, label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm transition-colors ${
                filter === s.id ? "bg-subtle text-foreground ring-1 ring-border" : "text-muted hover:text-foreground"
              }`}
            >
              {"dot" in s && <span className={`size-2 rounded-full ${s.dot}`} />}
              {s.label}
              <span className="font-mono text-xs text-muted">{counts[s.id]}</span>
            </button>
          ))}
        </div>
        {canEdit && <Segmented label="Sort by" options={SORTS} value={sort} onChange={setSort} />}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div
          className={`hidden items-center gap-4 bg-foreground px-4 py-2 text-xs text-on-foreground/75 sm:grid ${canEdit ? "grid-cols-[88px_1fr_160px_120px_80px]" : "grid-cols-[88px_1fr_160px_120px]"}`}
        >
          <span>Regular · Fill</span>
          <span>Name</span>
          <span>Status</span>
          <span>{SORTS.find((s) => s.id === column)!.label}</span>
          {canEdit && <span />}
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((i) => (
              <li
                key={i.id}
                className={`grid grid-cols-[88px_1fr] items-center gap-x-4 gap-y-2 px-4 py-3 ${canEdit ? "sm:grid-cols-[88px_1fr_160px_120px_80px]" : "sm:grid-cols-[88px_1fr_160px_120px]"}`}
              >
                <div className="row-span-2 flex gap-2 sm:row-span-1">
                  <Thumb pixels={i.pixels} />
                  <Thumb pixels={i.fill} />
                </div>
                <div className="min-w-0">
                  {canEdit ? (
                    <Link href={`/icons/${i.id}`} className="block truncate font-mono text-sm hover:underline">
                      {i.name}
                    </Link>
                  ) : (
                    <p className="truncate font-mono text-sm">{i.name}</p>
                  )}
                  {i.alts.length > 0 && <p className="truncate font-mono text-xs text-muted">{i.alts.join(", ")}</p>}
                </div>
                {canEdit ? (
                  <StatusSelect
                    value={i.status}
                    canValidate={!isBlank(i.pixels) && !isBlank(i.fill)}
                    disabled={pending}
                    onChange={(s) => run(() => setIconStatus(i.id, s))}
                  />
                ) : (
                  <StatusBadge status={i.status} />
                )}
                {column === "views" || column === "downloads" ? (
                  <span className="hidden font-mono text-sm text-muted sm:block">{i[column]}</span>
                ) : (
                  // Relative/local time differs between server and browser render.
                  <span
                    className="hidden text-sm text-muted sm:block"
                    title={new Date(column === "created" ? i.createdAt : i.updatedAt).toLocaleString()}
                    suppressHydrationWarning
                  >
                    {timeAgo(column === "created" ? i.createdAt : i.updatedAt)}
                  </span>
                )}
                {canEdit && (
                  <Link href={`/icons/${i.id}`} className="btn hidden h-8 sm:inline-flex">
                    {i.status === "requested" ? "Draw" : "Edit"}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Small preview; an empty dashed square when there's nothing drawn yet. */
function Thumb({ pixels }: { pixels: string | null }) {
  return (
    <div className="flex size-10 items-center justify-center rounded-md border border-border">
      {isBlank(pixels) ? (
        <span className="size-5 rounded-sm border border-dashed border-border-strong" />
      ) : (
        <IconGlyph pixels={pixels!} style="pixel" size={24} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const s = STATUSES.find((x) => x.id === status)!;
  return (
    <span className="inline-flex h-6 w-fit items-center gap-1.5 rounded-full border border-border px-2.5 text-xs">
      <span className={`size-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatusSelect({
  value,
  canValidate,
  disabled,
  onChange,
}: {
  value: Status;
  canValidate: boolean;
  disabled: boolean;
  onChange: (s: Status) => void;
}) {
  return (
    <Select
      label="Status"
      value={value}
      disabled={disabled}
      onChange={onChange}
      dot={STATUSES.find((s) => s.id === value)!.dot}
      options={STATUSES.map((s) => ({ ...s, disabled: s.id === "validated" && !canValidate }))}
    />
  );
}

/** Native select with a chevron and an optional status dot in front of the value. */
function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  dot,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  dot?: string;
}) {
  return (
    <div className="relative w-fit">
      {dot && <span className={`pointer-events-none absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full ${dot}`} />}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-8 appearance-none rounded-md border border-border bg-background pr-7 text-sm outline-none hover:border-border-strong focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 ${dot ? "pl-6" : "pl-2.5"}`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secs] of [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ] as const)
    if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  return "just now";
}

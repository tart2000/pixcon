"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { requestIcon, setIconStatus } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/status";
import { IconGlyph } from "./IconGlyph";
import { matchesQuery } from "@/lib/alts";
import { toSlug, typingSlug } from "@/lib/slug";
import { canEdit } from "@/lib/editing";

type Item = { id: number; name: string; alts: string[]; pixels: string; fill: string | null; status: Status; updatedAt: string };

const isBlank = (pixels: string | null) => !pixels || !pixels.includes("1");

export function ManageList({ icons }: { icons: Item[] }) {
  const [filter, setFilter] = useState<Status | "all">("all");
  // One field to both search and request: typing filters the list, so duplicates show up before asking.
  const [request, setRequest] = useState("");
  const [requested, setRequested] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: icons.length };
    for (const s of STATUSES) c[s.id] = icons.filter((i) => i.status === s.id).length;
    return c;
  }, [icons]);

  const rows = useMemo(() => {
    return icons.filter((i) => (filter === "all" || i.status === filter) && matchesQuery(i, request));
  }, [icons, filter, request]);

  const slug = toSlug(request);
  const existing = slug ? icons.find((i) => i.name === slug) : undefined;

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
    if (!slug || existing) return;
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
          <button className="btn-primary" disabled={!slug || !!existing || pending}>
            Request
          </button>
        </div>
        {existing ? (
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div
          className={`hidden items-center gap-4 border-b border-border bg-subtle px-4 py-2 text-xs text-muted sm:grid ${canEdit ? "grid-cols-[88px_1fr_160px_120px_80px]" : "grid-cols-[88px_1fr_160px_120px]"}`}
        >
          <span>Regular · Fill</span>
          <span>Name</span>
          <span>Status</span>
          <span>Updated</span>
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
                {/* Relative/local time differs between server and browser render. */}
                <span
                  className="hidden text-sm text-muted sm:block"
                  title={new Date(i.updatedAt).toLocaleString()}
                  suppressHydrationWarning
                >
                  {timeAgo(i.updatedAt)}
                </span>
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
  const dot = STATUSES.find((s) => s.id === value)!.dot;
  return (
    <div className="relative w-fit">
      <span className={`pointer-events-none absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full ${dot}`} />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as Status)}
        className="h-8 appearance-none rounded-md border border-border bg-background pr-7 pl-6 text-sm outline-none hover:border-border-strong focus:ring-2 focus:ring-foreground/10 disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s.id} value={s.id} disabled={s.id === "validated" && !canValidate}>
            {s.label}
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

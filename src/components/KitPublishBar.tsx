"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishKitNow } from "@/app/actions";
import type { KitStatus } from "@/lib/kitPublish";

/** On /manage: what's waiting to go live, and the button that publishes it (validates ready icons, rebuilds the kit). */
export function KitPublishBar({ ready, stale, building }: KitStatus) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!ready && !stale && !building) return null;

  const waiting = [
    ready > 0 && `${ready} icon${ready > 1 ? "s" : ""} ready to go live`,
    stale && "published icons changed since the kit was built",
  ].filter(Boolean);
  const message = waiting.length
    ? `${waiting.join(", and ")}.`.replace(/^./, (c) => c.toUpperCase())
    : "The kit is being rebuilt: it goes live in a minute or two.";

  const publish = () => {
    setError(null);
    startTransition(async () => {
      try {
        await publishKitNow();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Publishing failed");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-subtle px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span>
          {message}
          {building && waiting.length > 0 && <span className="text-muted"> A build is already running.</span>}
        </span>
        {waiting.length > 0 && (
          <button className="btn h-8 whitespace-nowrap" onClick={publish} disabled={pending}>
            {pending ? "Publishing…" : "Publish the kit"}
          </button>
        )}
      </div>
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

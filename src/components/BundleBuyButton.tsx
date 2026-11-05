"use client";

import { useState, useTransition } from "react";
import { startBundleCheckout } from "@/app/bundle/actions";

/** Opens Stripe's checkout for the bundle. */
export function BundleBuyButton({ label, className = "" }: { label: string; className?: string }) {
  const [paying, startPaying] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const buy = () =>
    startPaying(async () => {
      setError(null);
      try {
        window.location.assign(await startBundleCheckout());
      } catch {
        setError("Checkout couldn't start. Please try again.");
      }
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <button className={`btn-fun btn-fun-primary ${className}`} onClick={buy} disabled={paying}>
        {paying ? "Opening checkout…" : label}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

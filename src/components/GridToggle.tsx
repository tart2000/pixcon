"use client";

/** Shows or hides the grid behind the icons (the kit's `px-gridded`). */
export function GridToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      aria-pressed={value}
      title={value ? "Hide the grid" : "Show the grid"}
      onClick={() => onChange(!value)}
      className={`btn h-9 gap-2 px-3 ${value ? "border-foreground bg-foreground text-on-foreground hover:bg-foreground" : ""}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
        <path d="M.6 .6h12.8v12.8H.6zM4.9 .6v12.8M9.1 .6v12.8M.6 4.9h12.8M.6 9.1h12.8" />
      </svg>
      Grid
    </button>
  );
}

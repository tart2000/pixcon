"use client";

import { useId, useMemo, useState } from "react";
import { MAX_ALTS, normalizeAlt } from "@/lib/alts";

const MAX_SUGGESTIONS = 8;

/**
 * Tag input: Enter or comma adds an alt, Backspace on an empty field removes the last one.
 * While typing, existing alts (`suggestions`, most used first) are offered: ↑/↓ to pick, Enter or Tab to add.
 */
export function AltsInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (alts: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const add = (raw: string) => {
    const tags = raw.split(",").map(normalizeAlt).filter((t) => t && !value.includes(t));
    if (tags.length) onChange([...value, ...new Set(tags)].slice(0, MAX_ALTS));
    setDraft("");
    setActive(0);
  };

  // Tags starting with the draft first, then those containing it.
  const matches = useMemo(() => {
    const q = normalizeAlt(draft);
    if (!q) return [];
    const free = suggestions.filter((s) => !value.includes(s) && s !== q);
    return [...free.filter((s) => s.startsWith(q)), ...free.filter((s) => !s.startsWith(q) && s.includes(q))].slice(
      0,
      MAX_SUGGESTIONS,
    );
  }, [draft, suggestions, value]);
  const open = focused && matches.length > 0;
  const current = Math.min(active, matches.length - 1);

  return (
    <div className="relative">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-foreground/10">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex h-6 items-center gap-1 rounded bg-subtle pr-1 pl-2 font-mono text-xs ring-1 ring-border"
          >
            {t}
            <button
              type="button"
              className="text-muted hover:text-foreground"
              onClick={() => onChange(value.filter((x) => x !== t))}
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="alts"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="min-w-24 flex-1 bg-transparent px-1 font-mono text-sm outline-none placeholder:text-muted"
          placeholder={value.length ? "" : "love, like, favorite"}
          value={draft}
          disabled={value.length >= MAX_ALTS}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setActive(0);
            if (e.target.value.includes(",")) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setActive((current + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
            } else if (open && (e.key === "Enter" || e.key === "Tab")) {
              e.preventDefault();
              add(matches[current]);
            } else if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Escape") setFocused(false);
            else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) add(draft);
          }}
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          {matches.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === current}
              // mousedown, not click: keep focus in the input so blur doesn't add the half-typed draft.
              onMouseDown={(e) => {
                e.preventDefault();
                add(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex h-8 cursor-pointer items-center rounded-md px-2 font-mono text-sm ${
                i === current ? "bg-subtle" : ""
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

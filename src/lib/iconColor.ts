"use client";

import { useSyncExternalStore } from "react";
import { COLOR_KEY, findSwatch } from "./palette";

/** A string persisted in localStorage, shared live between every component that reads it. */
function store(key: string) {
  const listeners = new Set<() => void>();
  const read = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", cb);
    };
  };
  const write = (value: string | null) => {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
    listeners.forEach((cb) => cb());
  };
  const use = () => useSyncExternalStore(subscribe, read, () => null);
  return { read, write, use };
}

/**
 * Colour picked by the viewer (a palette `main`), shared between every view; it also themes the UI.
 * null = default theme. Values no longer in the palette (old custom colours) count as null.
 */
const color = store(COLOR_KEY);
export const useIconColor = () => findSwatch(color.use())?.main ?? null;
export const setIconColor = color.write;

"use client";

import { useEffect } from "react";
import { useIconColor } from "@/lib/iconColor";
import { applyTheme, findSwatch } from "@/lib/palette";

/** Keeps the UI theme in sync with the picked colour (the inline THEME_SCRIPT handles first paint). */
export function ThemeSync() {
  const color = useIconColor();
  useEffect(() => applyTheme(document.documentElement, findSwatch(color)), [color]);
  return null;
}

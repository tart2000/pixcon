/**
 * Base colours the viewer can theme the app with. `main` replaces the foreground
 * (text, buttons, icons); `secondary` is its light tint, used for subtle backgrounds.
 */
export const PALETTE = [
  { name: "Red", main: "#e5484d", secondary: "#ffdbdc" },
  { name: "Crimson", main: "#e54666", secondary: "#ffdce1" },
  { name: "Pink", main: "#d6409f", secondary: "#fbdcef" },
  { name: "Plum", main: "#ab4aba", secondary: "#f7def8" },
  { name: "Purple", main: "#8e4ec6", secondary: "#f2e2fc" },
  { name: "Violet", main: "#6e56cf", secondary: "#ebe4ff" },
  { name: "Indigo", main: "#3e63dd", secondary: "#e1e9ff" },
  { name: "Blue", main: "#0090ff", secondary: "#d5efff" },
  { name: "Cyan", main: "#00a2c7", secondary: "#caf1f6" },
  { name: "Teal", main: "#12a594", secondary: "#ccf3ea" },
  { name: "Green", main: "#30a46c", secondary: "#d6f1df" },
  { name: "Lime", main: "#bdee63", secondary: "#e2f0bd" },
  { name: "Yellow", main: "#ffe629", secondary: "#fff7c2" },
  { name: "Amber", main: "#ffc53d", secondary: "#ffee9c" },
  { name: "Orange", main: "#f76b15", secondary: "#ffdcc3" },
  { name: "Brown", main: "#ad7f58", secondary: "#f6e1d0" },
  { name: "Gold", main: "#978365", secondary: "#ece6d9" },
  { name: "Gray", main: "#8d8d8d", secondary: "#e8e8e8" },
] as const;

export type Swatch = (typeof PALETTE)[number];

export const findSwatch = (main: string | null): Swatch | null => PALETTE.find((s) => s.main === main) ?? null;

/** Black or white, whichever reads best on top of `hex`. */
export function onColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}

export const COLOR_KEY = "pixcon:icon-color";

/** Theme the whole UI with a swatch (null = default black/white theme). See `.theme` rules in globals.css. */
export function applyTheme(root: HTMLElement, swatch: Swatch | null) {
  if (!swatch) {
    root.removeAttribute("data-color");
    for (const v of ["--main", "--main-secondary", "--on-main"]) root.style.removeProperty(v);
    return;
  }
  root.setAttribute("data-color", swatch.name.toLowerCase());
  root.style.setProperty("--main", swatch.main);
  root.style.setProperty("--main-secondary", swatch.secondary);
  root.style.setProperty("--on-main", onColor(swatch.main));
}

/** Inline script applying the saved theme before first paint (no flash of the default theme). */
export const THEME_SCRIPT = `(function(){try{
var p=${JSON.stringify(Object.fromEntries(PALETTE.map((s) => [s.main, [s.name.toLowerCase(), s.secondary, onColor(s.main)]])))};
var m=localStorage.getItem(${JSON.stringify(COLOR_KEY)}),s=m&&p[m];if(!s)return;
var r=document.documentElement;r.setAttribute("data-color",s[0]);
r.style.setProperty("--main",m);r.style.setProperty("--main-secondary",s[1]);r.style.setProperty("--on-main",s[2]);
}catch(e){}})();`;

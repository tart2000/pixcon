/**
 * Pixcon kit: renders `<i class="px px-heart px-blob px-fill"></i>` as inline SVG.
 * Icons ship as 11×11 grids (hex) and are drawn here with the same engine as the site.
 * Built into public/kit/pixicons.js by scripts/build-kit.mjs, which injects the icons.
 */
import { VARIANTS, fromHex, type Variant } from "@/lib/pixels";
import { RESERVED_NAMES } from "@/lib/reserved";
import { STYLES, VIEWBOX, iconPath, type StyleId } from "@/lib/svg";

/** name → [regular, fill | null], grids as hex. */
declare const __PIXCON_ICONS__: Record<string, [string, string | null]>;
const ICONS = __PIXCON_ICONS__;

const STYLE_IDS = new Set<string>(STYLES.map((s) => s.id));
const VARIANT_IDS = new Set<string>(VARIANTS.map((v) => v.id));
const RESERVED = new Set(RESERVED_NAMES);

// Page-wide defaults: <script src=".../pixicons.js" data-style="blob" data-variant="fill">
const script = document.currentScript as HTMLScriptElement | null;
const pick = <T extends string>(value: string | undefined, ids: Set<string>, fallback: T) =>
  (value && ids.has(value) ? value : fallback) as T;
const defaultStyle = pick<StyleId>(script?.dataset.style, STYLE_IDS, "pixel");
const defaultVariant = pick<Variant>(script?.dataset.variant, VARIANT_IDS, "regular");

const paths = new Map<string, string>();
const warned = new Set<string>();

function pathFor(name: string, style: StyleId, variant: Variant): string | null {
  const key = `${name}/${style}/${variant}`;
  const cached = paths.get(key);
  if (cached !== undefined) return cached;
  const icon = ICONS[name];
  if (!icon) return null;
  const d = iconPath(fromHex((variant === "fill" && icon[1]) || icon[0]), style);
  paths.set(key, d);
  return d;
}

function render(el: HTMLElement) {
  let name = "";
  let style = defaultStyle;
  let variant = defaultVariant;
  for (const c of el.classList) {
    if (!c.startsWith("px-")) continue;
    const v = c.slice(3);
    if (STYLE_IDS.has(v)) style = v as StyleId;
    else if (VARIANT_IDS.has(v)) variant = v as Variant;
    else if (!RESERVED.has(v)) name = v;
  }
  const key = `${name}/${style}/${variant}`;
  if (el.dataset.pxRendered === key) return;
  el.dataset.pxRendered = key;

  const d = name ? pathFor(name, style, variant) : null;
  if (!d) {
    if (name && !warned.has(name)) {
      warned.add(name);
      console.warn(`[pixcon] Unknown icon “${name}”`);
    }
    el.replaceChildren();
    return;
  }
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

function scan(root: ParentNode | Element) {
  if (root instanceof HTMLElement && root.classList.contains("px")) render(root);
  root.querySelectorAll<HTMLElement>(".px").forEach(render);
}

function start() {
  const style = document.createElement("style");
  style.textContent =
    ".px{display:inline-block;width:1em;height:1em;line-height:1;vertical-align:-.125em}.px>svg{display:block;width:100%;height:100%}";
  document.head.appendChild(style);
  scan(document);
  // Icons added later (frameworks, AJAX) or restyled by swapping classes.
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") scan(r.target as Element);
      else r.addedNodes.forEach((n) => n instanceof Element && scan(n));
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();

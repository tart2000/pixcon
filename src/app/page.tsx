import Link from "next/link";
import { connection } from "next/server";
import { listIcons } from "@/lib/db";
import { VARIANTS } from "@/lib/pixels";
import { STYLES, type StyleId } from "@/lib/svg";
import { IconGlyph } from "@/components/IconGlyph";
import { HeroPattern } from "@/components/home/HeroPattern";
import { LibraryPreview } from "@/components/home/LibraryPreview";
import { CodeBlock } from "@/components/CodeBlock";
import { KIT_SCRIPT } from "@/lib/kit";
import { kitSizeKB } from "@/lib/kitSize";

/** Icons shown in the library preview, when they exist. */
const PREVIEW = [
  "heart", "star", "home", "user", "camera", "music", "bell", "envelope",
  "calendar", "lightbulb", "crown", "ghost", "cat", "coffee", "sun", "moon",
  "cloud", "fire", "leaf", "gamepad", "trophy", "key", "lock", "magnifying-glass",
  "chat", "headphones", "bicycle", "space-invaders", "robot", "ufo", "skull", "sparkles",
];

/** Families shown on the home page: a tag, its label and six hand-picked icons from it. */
const FAMILIES = [
  { tag: "retro", label: "Retro", icons: ["computer-retro", "floppy-disk", "game-console-handheld", "space-invaders", "ghost", "mushroom-retro"] },
  { tag: "outdoors", label: "Outdoors", icons: ["tent", "mountains", "compass", "binoculars", "tree", "table-picnic"] },
  { tag: "animal", label: "Animals", icons: ["cat", "dog", "owl", "elephant", "rabbit", "snail"] },
  { tag: "food", label: "Food", icons: ["candy", "barbecue", "icecream-cone", "cherries", "coffee", "cheese"] },
  { tag: "game", label: "Games", icons: ["dice-five", "gamepad", "joystick", "bowling-ball", "trophy", "axe-battle"] },
  { tag: "transport", label: "Transport", icons: ["airplane", "bicycle", "bus", "truck", "scooter", "helicopter"] },
];

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** One showcase icon and a line of description per style. */
const STYLE_SHOWCASE: Record<StyleId, { icon: string; text: string; fill?: boolean }> = {
  pixel: { icon: "space-invaders", text: "Square pixels, crisp and true to the grid." },
  rounded: { icon: "heart", text: "The same pixels, every corner gently softened.", fill: true },
  blob: { icon: "ghost", text: "Fully round corners, like little bubbles." },
  liquid: { icon: "cat", text: "Pixels melt into each other." },
  "liquid-blob": { icon: "eyes", text: "Melted pixels with fully round curves." },
  retro: { icon: "computer-retro", text: "Glowing scanlines, like an old CRT screen.", fill: true },
  stitch: { icon: "flower", text: "Every pixel a cross, like embroidery." },
  knit: { icon: "hat-winter", text: "Rows of little chevrons, like a cosy jumper." },
  dots: { icon: "dice-six", text: "Four round dots per pixel, like an LED board." },
};

export default async function Home() {
  await connection();
  const icons = await listIcons("validated");
  const byName = new Map(icons.map((i) => [i.name, { name: i.name, pixels: i.pixels, fill: i.pixels_fill }]));
  const glyph = (name: string, size = 20) => {
    const i = byName.get(name);
    return i ? <IconGlyph pixels={i.pixels} style="pixel" size={size} /> : null;
  };
  // Top up with other icons if some aren't drawn yet, so the grid always ends on a full row.
  const kb = kitSizeKB();
  const families = FAMILIES.map((f) => ({
    ...f,
    total: icons.filter((i) => i.alts.includes(f.tag)).length,
    picks: f.icons.flatMap((n) => byName.get(n) ?? []),
  }));
  const preview = [
    ...PREVIEW.flatMap((n) => byName.get(n) ?? []),
    ...[...byName.values()].filter((i) => !PREVIEW.includes(i.name)),
  ].slice(0, PREVIEW.length);
  // Round down to a modest figure so the "+" stays true: 334 → 300+.
  const step = icons.length >= 100 ? 100 : 10;
  const count = icons.length >= 20 ? `${Math.floor(icons.length / step) * step}+` : String(icons.length);

  const stats = [
    { value: count, label: "Icons in the library", icon: "grid" },
    { value: String(STYLES.length), label: "Unique styles", icon: "sparkles" },
    { value: String(VARIANTS.length), label: `Variants · ${VARIANTS.map((v) => v.label).join(" & ")}`, icon: "swap" },
  ];

  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {/* Full-bleed hero, flush with the header. */}
      <section className="relative -mt-8 ml-[calc(50%-50vw)] w-screen overflow-hidden border-b border-border bg-background sm:-mt-10">
        <HeroPattern icons={icons.map((i) => ({ pixels: i.pixels, fill: i.pixels_fill }))} />
        <div className="hero-rows relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
          <span className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs tracking-wide text-muted">
            Open source · 11×11 pixel grid
          </span>
          <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl">
            Pixel icons
            <br />
            with personality.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Add one tiny script and drop icons straight into your HTML. Pick a style, pick a colour, or just grab the
            SVG.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link href="/icons" className="btn-fun btn-fun-primary">
              {glyph("eyes")}
              Browse icons
            </Link>
            <Link href="/how-to" className="btn-fun">
              {glyph("book-open")}
              How to
            </Link>
          </div>
        </div>
      </section>

      <section className={`grid gap-4 sm:grid-cols-2 ${kb ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-6">
            <span className="text-muted">{glyph(s.icon, 24)}</span>
            <span className="font-display text-6xl">{s.value}</span>
            <span className="text-muted">{s.label}</span>
          </div>
        ))}
        {/* The kit's weight, measured on the built file: the highlight of the row. */}
        {kb && (
          <div className="flex flex-col gap-3 rounded-xl bg-foreground p-6 text-on-foreground">
            <span className="opacity-70">{glyph("code", 24)}</span>
            <span className="font-display text-6xl">{kb} KB</span>
            <span className="opacity-80">Every icon in one tiny file.</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-8">
        <SectionTitle eyebrow="The styles" title={`One grid, ${NUMBERS[STYLES.length] ?? STYLES.length} styles.`} />
        {/* Same width as the figures above: three per row, the last row centred. */}
        <div className="flex flex-wrap justify-center gap-4">
          {STYLES.map((st) => {
            const { icon, text, fill } = STYLE_SHOWCASE[st.id];
            const i = byName.get(icon);
            return (
              <div
                key={st.id}
                className="flex w-full items-center gap-5 rounded-xl border border-border bg-background p-5 sm:w-[calc((100%-2rem)/3)]"
              >
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-subtle p-4">
                  {i && <IconGlyph pixels={(fill && i.fill) || i.pixels} style={st.id} size={128} />}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="font-display text-2xl">{st.label}</h3>
                  <code className="font-mono text-xs whitespace-nowrap text-muted">px-{st.id}</code>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <SectionTitle eyebrow="The families" title="Something for every project." />
        {/* A table: one white panel, rows split by lines like its border, fixed columns so everything lines up. */}
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
          {families.map((f) => (
            <li
              key={f.tag}
              className="grid grid-cols-1 items-center gap-3 px-5 py-3 sm:grid-cols-[10rem_1fr_13rem] sm:gap-6"
            >
              <div className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
                <h3 className="font-display text-3xl">{f.label}</h3>
                <span className="text-sm text-muted">{f.total} icons</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {f.picks.map((i) => (
                  <Link
                    key={i.name}
                    href={`/icons?icon=${encodeURIComponent(i.name)}`}
                    title={i.name}
                    className="flex h-14 items-center justify-center rounded-lg transition-colors hover:bg-subtle"
                  >
                    <IconGlyph pixels={i.pixels} style="liquid-blob" size={36} />
                  </Link>
                ))}
              </div>
              <Link href={`/icons?q=${encodeURIComponent(f.tag)}`} className="btn w-full">
                See all {f.label.toLowerCase()} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-8">
        <SectionTitle eyebrow="The library" title="Pick one, make it yours." />
        <LibraryPreview icons={preview} total={icons.length} />
      </section>

      <section className="flex flex-col gap-8">
        <SectionTitle eyebrow="How to use" title="Copy, paste, done." />
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Add the script",
              text: `One line in your page${kb ? `, ${kb} KB` : ""}. Every icon is included.`,
              icon: "code",
            },
            { title: "Summon an icon", text: "Drop a tiny <i> tag, say which icon, style and variant you want, and poof, it appears.", icon: "magic" },
            { title: "Style it like text", text: "Icons take the font size and colour of their parent.", icon: "paintbrush" },
          ].map((step, n) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-muted">0{n + 1}</span>
                <span className="text-muted">{glyph(step.icon, 24)}</span>
              </div>
              <h3 className="font-display text-2xl">{step.title}</h3>
              <p className="text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-muted">In your &lt;head&gt;</span>
            <CodeBlock code={KIT_SCRIPT} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs text-muted">Anywhere in your page</span>
            <CodeBlock code={`<i class="px px-heart px-blob px-fill"></i>`} />
          </div>
        </div>
        <Link href="/how-to" className="btn-fun self-center">
          {glyph("book-open")}
          Read the guide
        </Link>
      </section>

      <section className="flex flex-col items-center gap-5 rounded-xl border border-border bg-background px-6 py-14 text-center">
        <span className="text-muted">{glyph("magnifying-glass", 40)}</span>
        <h2 className="font-display text-4xl sm:text-5xl">Not finding what you&apos;re looking for?</h2>
        <p className="max-w-md text-muted">Tell us which icon you need and it goes on the drawing list.</p>
        <Link href="/manage" className="btn-fun btn-fun-primary mt-2">
          {glyph("plus")}
          Request an icon
        </Link>
      </section>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="font-mono text-xs tracking-[0.2em] text-muted uppercase">{eyebrow}</span>
      <h2 className="font-display text-4xl sm:text-5xl">{title}</h2>
    </div>
  );
}

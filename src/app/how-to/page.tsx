import Link from "next/link";
import Script from "next/script";
import { CodeBlock } from "@/components/CodeBlock";
import { KIT_SCRIPT, KIT_URL } from "@/lib/kit";
import { kitSizeKB } from "@/lib/kitSize";
import { VARIANTS } from "@/lib/pixels";
import { STYLES } from "@/lib/svg";

export const metadata = { title: "How to · Pixcon" };

const DEMO = "heart";

export default function GettingStartedPage() {
  const kb = kitSizeKB();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12">
      {/* Loads the real kit so the examples below are drawn by it. */}
      <Script src="/kit/pixcon.js" />

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">How to</h1>
        <p className="text-lg text-muted">
          Pixcon ships as one small script{kb ? ` (${kb} KB)` : ""} with every icon included. Add it once, then write
          icons as plain HTML.
        </p>
      </header>

      <Step n={1} title="Add the script">
        <p className="text-muted">
          Paste this line in the <code className="font-mono text-foreground">&lt;head&gt;</code> of your page.
        </p>
        <CodeBlock code={KIT_SCRIPT} />
      </Step>

      <Step n={2} title="Write an icon">
        <p className="text-muted">
          Use an <code className="font-mono text-foreground">&lt;i&gt;</code> with the{" "}
          <code className="font-mono text-foreground">px</code> class, the icon name, a style and a variant. Find names in{" "}
          <Link href="/icons" className="text-foreground underline underline-offset-4">
            the library
          </Link>
          ; each icon&apos;s popup gives you the exact HTML.
        </p>
        <CodeBlock code={`<i class="px px-${DEMO} px-blob px-fill"></i>`} />
        <div className="flex items-center gap-6 rounded-lg border border-border bg-background p-6 text-5xl">
          <i className="px px-heart px-blob px-fill" />
          <i className="px px-ghost px-liquid px-regular" />
          <i className="px px-cat px-pixel px-fill" />
          <i className="px px-ufo px-liquid-blob px-regular" />
        </div>
      </Step>

      <Step n={3} title="Pick a style and a variant">
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-muted">
              <tr>
                <th className="px-4 py-2 font-normal">Class</th>
                <th className="px-4 py-2 font-normal">Regular</th>
                <th className="px-4 py-2 font-normal">Fill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STYLES.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-mono">px-{s.id}</td>
                  {VARIANTS.map((v) => (
                    <td key={v.id} className="px-4 py-3 text-3xl">
                      <i className={`px px-${DEMO} px-${s.id} px-${v.id}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted">
          Variants are <code className="font-mono text-foreground">px-regular</code> and{" "}
          <code className="font-mono text-foreground">px-fill</code>. Leave them out and you get{" "}
          <code className="font-mono text-foreground">px-pixel</code> and{" "}
          <code className="font-mono text-foreground">px-regular</code>, or set your own defaults for the whole page:
        </p>
        <CodeBlock code={`<script src="${KIT_URL}" data-style="blob" data-variant="fill"></script>`} />
      </Step>

      <Step n={4} title="Size and colour">
        <p className="text-muted">
          Icons are 1em square and use the current text colour, so style them like text.
        </p>
        <CodeBlock code={`<span style="font-size: 32px; color: crimson">\n  <i class="px px-${DEMO} px-liquid px-fill"></i>\n</span>`} />
        <div className="flex items-end gap-6 rounded-lg border border-border bg-background p-6">
          {[16, 24, 32, 48, 64].map((size) => (
            <span key={size} style={{ fontSize: size }}>
              <i className={`px px-${DEMO} px-liquid px-fill`} />
            </span>
          ))}
        </div>
        <p className="text-muted">
          Icons added later (React, Vue, AJAX…) are drawn automatically, and changing a class redraws the icon.
        </p>
      </Step>

      <Step n={5} title="Rather have SVG files?">
        <p className="text-muted">
          No script needed. Open any icon in{" "}
          <Link href="/icons" className="text-foreground underline underline-offset-4">
            the library
          </Link>
          , pick a variant, a style and a colour, then copy the SVG or download it. Paste it into your code, Figma or any
          design tool.
        </p>
      </Step>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-baseline gap-3 font-display text-3xl">
        <span className="font-mono text-base text-muted">0{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

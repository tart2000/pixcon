"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./UiIcons";

/** Code snippet with a copy button, inverted (dark on light, light on dark) so it stands out. */
export function CodeBlock({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className={`relative rounded-lg bg-foreground text-on-foreground ${className}`}>
      <pre className="overflow-x-auto p-4 pr-12 font-mono text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md text-on-foreground/60 transition-colors hover:bg-on-foreground/10 hover:text-on-foreground"
        title="Copy"
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

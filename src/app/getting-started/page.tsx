import Link from "next/link";

export const metadata = { title: "Getting started · Pixcon" };

// Placeholder: explains how Pixcon works once the content is written.
export default function GettingStartedPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-4xl">Getting started</h1>
      <p className="text-muted">How Pixcon works, and how to use the icons in your projects. Coming soon.</p>
      <p className="text-muted">
        In the meantime, <Link href="/icons" className="text-foreground underline underline-offset-4">browse the icons</Link>{" "}
        or <Link href="/manage" className="text-foreground underline underline-offset-4">request one</Link>.
      </p>
    </div>
  );
}

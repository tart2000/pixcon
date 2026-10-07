import Link from "next/link";

// Placeholder home page, to be designed.
export default function Home() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Pixel icons, drawn together.</h1>
      <p className="max-w-xl text-lg text-muted">
        Open-source 11×11 pixel icons in several styles, free to copy or download as SVG.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/icons" className="btn-primary">
          Browse icons
        </Link>
        <Link href="/getting-started" className="btn">
          Getting started
        </Link>
      </div>
    </div>
  );
}

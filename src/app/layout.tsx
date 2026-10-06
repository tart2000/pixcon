import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/ThemeSync";
import { THEME_SCRIPT } from "@/lib/palette";
import { canEdit } from "@/lib/editing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pixcon",
  description: "Collaborative 11×11 pixel icons, exportable as SVG.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script sets the picked colour on <html> before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <ThemeSync />
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo />
              Pixcon
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="hidden rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground sm:block"
              >
                Icons
              </Link>
              <Link href="/manage" className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground">
                {canEdit ? "Manage" : "Requests"}
              </Link>
              {canEdit ? (
                <Link href="/new" className="btn-primary ml-2 h-8 px-3 whitespace-nowrap">
                  New icon
                </Link>
              ) : (
                <Link href="/manage" className="btn-primary ml-2 h-8 px-3 whitespace-nowrap">
                  Request an icon
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 110 110" fill="currentColor" aria-hidden>
      <path d="M20 25A5 5 0 0 1 25 20L25 20L25 25L20 25zM25 20h5v5h-5zM25 25h5v5h-5zM20 25h5v5h-5zM30 20h5v5h-5zM35 20h5v5h-5zM35 25h5v5h-5zM30 25h5v5h-5zM40 20h5v5h-5zM45 20h5v5h-5zM45 25h5v5h-5zM40 25h5v5h-5zM50 20h5v5h-5zM55 20L55 20A5 5 0 0 1 60 25L60 25L55 25zM55 25h5v5h-5zM50 25h5v5h-5zM60 30L60 25A5 5 0 0 0 65 30zM20 30h5v5h-5zM25 30h5v5h-5zM25 35h5v5h-5zM20 35h5v5h-5zM30 30L35 30A5 5 0 0 0 30 35zM35 30L40 30L40 35A5 5 0 0 0 35 30zM30 40L30 35A5 5 0 0 0 35 40zM40 30h5v5h-5zM45 30h5v5h-5zM45 35L50 35L50 35A5 5 0 0 1 45 40L45 40zM40 35L45 35L45 40L45 40A5 5 0 0 1 40 35zM50 30L55 30A5 5 0 0 0 50 35zM55 30L60 30L60 35A5 5 0 0 0 55 30zM60 35L60 40L55 40A5 5 0 0 0 60 35zM60 30h5v5h-5zM65 30L65 30A5 5 0 0 1 70 35L70 35L65 35zM65 35h5v5h-5zM60 35h5v5h-5zM20 40h5v5h-5zM25 40h5v5h-5zM25 45h5v5h-5zM20 45h5v5h-5zM30 40h5v5h-5zM35 40L35 40A5 5 0 0 1 40 45L40 45L35 45zM35 45L40 45L40 45A5 5 0 0 1 35 50L35 50zM30 45h5v5h-5zM50 45A5 5 0 0 1 55 40L55 40L55 45L50 45zM55 40h5v5h-5zM55 45h5v5h-5zM50 45L55 45L55 50L55 50A5 5 0 0 1 50 45zM60 40h5v5h-5zM65 40h5v5h-5zM65 45h5v5h-5zM60 45h5v5h-5zM20 50h5v5h-5zM25 50h5v5h-5zM25 55h5v5h-5zM20 55h5v5h-5zM30 50L35 50A5 5 0 0 0 30 55zM40 55L40 60L35 60A5 5 0 0 0 40 55zM30 60L30 55A5 5 0 0 0 35 60zM40 55A5 5 0 0 1 45 50L45 50L45 55L40 55zM45 50L45 50A5 5 0 0 1 50 55L50 55L45 55zM45 55h5v5h-5zM40 55h5v5h-5zM55 50L60 50L60 55A5 5 0 0 0 55 50zM60 55L60 60L55 60A5 5 0 0 0 60 55zM50 60L50 55A5 5 0 0 0 55 60zM60 50h5v5h-5zM65 50h5v5h-5zM65 55L70 55L70 55A5 5 0 0 1 65 60L65 60zM60 55h5v5h-5zM20 60h5v5h-5zM25 60h5v5h-5zM25 65h5v5h-5zM20 65h5v5h-5zM30 60h5v5h-5zM35 60h5v5h-5zM35 65h5v5h-5zM30 65h5v5h-5zM40 60h5v5h-5zM45 60h5v5h-5zM45 65h5v5h-5zM40 65h5v5h-5zM50 60h5v5h-5zM55 60h5v5h-5zM55 65L60 65L60 65A5 5 0 0 1 55 70L55 70zM50 65h5v5h-5zM60 60L65 60A5 5 0 0 0 60 65zM20 70h5v5h-5zM25 70h5v5h-5zM25 75h5v5h-5zM20 75h5v5h-5zM30 70L35 70A5 5 0 0 0 30 75zM80 75L80 80L75 80A5 5 0 0 0 80 75zM80 75A5 5 0 0 1 85 70L85 70L85 75L80 75zM85 70L85 70A5 5 0 0 1 90 75L90 75L85 75zM85 75h5v5h-5zM80 75h5v5h-5zM20 80h5v5h-5zM25 80h5v5h-5zM25 85L30 85L30 85A5 5 0 0 1 25 90L25 90zM20 85L25 85L25 90L25 90A5 5 0 0 1 20 85zM70 85A5 5 0 0 1 75 80L75 80L75 85L70 85zM75 80h5v5h-5zM75 85h5v5h-5zM70 85L75 85L75 90L75 90A5 5 0 0 1 70 85zM80 80h5v5h-5zM85 80h5v5h-5zM85 85L90 85L90 85A5 5 0 0 1 85 90L85 90zM80 85h5v5h-5z" />
    </svg>
  );
}

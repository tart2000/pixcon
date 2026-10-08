import type { Metadata } from "next";

/** The site-wide share image (app/opengraph-image.jpg, app/twitter-image.jpg). */
const IMAGE = { width: 1200, height: 630, alt: "Pixicons: pixel icons with personality" };

/** Page metadata with matching Open Graph / Twitter fields (a page's openGraph replaces the layout's, it isn't merged). */
export function pageMeta(title: string, description: string, path: string): Metadata {
  const full = `${title} · Pixicons`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // A page's openGraph also drops the root image files, so point at them again.
    openGraph: {
      type: "website",
      siteName: "Pixicons",
      locale: "en",
      url: path,
      title: full,
      description,
      images: [{ url: "/opengraph-image.jpg", ...IMAGE }],
    },
    twitter: { card: "summary_large_image", title: full, description, images: [{ url: "/twitter-image.jpg", ...IMAGE }] },
  };
}

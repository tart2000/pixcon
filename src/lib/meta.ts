import type { Metadata } from "next";

/** The site-wide share image (app/opengraph-image.jpg, app/twitter-image.jpg). */
const IMAGE = { width: 1200, height: 630, alt: "Pixicons: pixel icons with personality" };

/**
 * Page metadata with matching Open Graph / Twitter fields (a page's openGraph replaces the layout's, it isn't merged).
 * `image` is the page's own share image (1200×630), instead of the site's.
 */
export function pageMeta(title: string, description: string, path: string, image?: string): Metadata {
  const full = `${title} · Pixicons`;
  const og = image ? { url: image, ...IMAGE, alt: title } : { url: "/opengraph-image.jpg", ...IMAGE };
  const tw = image ? { url: image, ...IMAGE, alt: title } : { url: "/twitter-image.jpg", ...IMAGE };
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
      images: [og],
    },
    twitter: { card: "summary_large_image", title: full, description, images: [tw] },
  };
}

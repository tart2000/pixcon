import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // The requests page and the order confirmation have nothing to search for.
    rules: { userAgent: "*", allow: "/", disallow: ["/manage", "/shop/thanks", "/api/"] },
    sitemap: "https://www.pixicons.io/sitemap.xml",
  };
}

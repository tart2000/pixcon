import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // The requests page, the order confirmations and the buyers' download links have nothing to search for.
    rules: { userAgent: "*", allow: "/", disallow: ["/manage", "/shop/thanks", "/bundle/thanks", "/bundle/d/", "/api/"] },
    sitemap: "https://www.pixicons.io/sitemap.xml",
  };
}

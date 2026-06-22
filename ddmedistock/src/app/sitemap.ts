import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ddmedistock.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/products", "/exports", "/compliance", "/contact"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}

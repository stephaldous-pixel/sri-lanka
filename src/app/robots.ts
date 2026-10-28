import type { MetadataRoute } from "next";
import { isSitePublic } from "@/lib/site-access";

export default function robots(): MetadataRoute.Robots {
  return isSitePublic()
    ? { rules: { userAgent: "*", allow: "/" } }
    : { rules: { userAgent: "*", disallow: "/" } };
}

import { NextResponse } from "next/server";
import { POSTS } from "@/features/blog/posts";
import { siteConfig } from "@/config/site";

/**
 * Public RSS 2.0 feed for the Stackivo blog.
 *
 * Served at /feed.xml. Cached for an hour at the edge — posts are
 * statically authored, so this rate is generous.
 */
export const dynamic = "force-static";

export async function GET() {
  const sorted = [...POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const items = sorted
    .map((p) => {
      const url = `${siteConfig.url}/blog/${p.slug}`;
      const pub = new Date(`${p.publishedAt}T09:00:00.000Z`).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pub}</pubDate>`,
        `      <category>${escapeXml(p.category)}</category>`,
        `      <description>${escapeXml(p.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.name)} blog</title>
    <link>${siteConfig.url}/blog</link>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Practical writing for Indian freelancers — pricing, GST, contracts, taxes, cashflow.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

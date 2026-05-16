import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Rss } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/motion";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { POSTS } from "@/features/blog/posts";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Blog · Stackivo",
  description:
    "Honest, India-specific writing on freelancer pricing, GST, contracts, taxes, and cashflow. Written by the Stackivo team.",
  alternates: {
    canonical: "/blog",
    types: {
      "application/rss+xml": `${siteConfig.url}/feed.xml`,
    },
  },
  openGraph: {
    title: "Stackivo blog",
    description:
      "India-specific freelancer writing: pricing, GST, contracts, taxes, cashflow.",
    url: `${siteConfig.url}/blog`,
  },
};

export const dynamic = "force-static";

export default function BlogIndexPage() {
  const posts = [...POSTS].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );

  return (
    <>
      <Section size="default" className="pt-24 sm:pt-32 lg:pt-40">
        <SectionHeading
          eyebrow="Blog"
          title="Practical writing for Indian freelancers."
          subtitle="No clickbait, no fluff. Pricing, GST, contracts, taxes, and cashflow — written by the people building Stackivo."
        />
        <div className="mt-6 flex justify-center">
          <Link
            href="/feed.xml"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Rss className="h-3 w-3" />
            RSS feed
          </Link>
        </div>
      </Section>

      <Section size="default" className="pb-16 pt-4 sm:pb-20">
        <Reveal>
          <div className="mx-auto max-w-3xl space-y-4">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                data-cta={`blog_index_${p.slug}`}
                className="group block rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    <BookOpen className="h-3 w-3" />
                    {p.category}
                  </span>
                  <span>{formatDate(p.publishedAt)}</span>
                  <span>·</span>
                  <span>{p.readingMinutes} min read</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight transition group-hover:text-primary sm:text-[22px]">
                  {p.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Read post <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section size="default" className="pb-24">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-xl border bg-muted/20 p-6 text-center">
            <p className="text-sm font-medium">
              Get one practical India-freelancer tip a month.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pricing benchmarks, GST changes, contract templates. No spam.
            </p>
            <div className="mt-4 flex justify-center">
              <NewsletterForm
                source="blog_index"
                ctaLabel="Subscribe"
                successLabel="Subscribed. Talk soon."
              />
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

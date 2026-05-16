import type { ReactNode } from "react";

/**
 * Blog post shape.
 *
 * Posts live as TypeScript modules instead of MDX. Reasoning:
 *   - Zero new build dependencies (no MDX plugin, no compiler).
 *   - Full JSX/Link power inside the body without import-mapper
 *     friction.
 *   - Trivial to feed into RSS + sitemap (just iterate the array).
 *
 * Trade-off: writing posts requires React knowledge. We're a solo
 * SaaS where the founder is the writer, so this is fine.
 */
export interface BlogPost {
  /** URL slug (must be unique). */
  slug: string;
  /** SEO + listing title. */
  title: string;
  /** SEO description + listing tagline. ~150 chars max. */
  description: string;
  /** ISO date YYYY-MM-DD. */
  publishedAt: string;
  /** Optional last-updated date. */
  updatedAt?: string;
  /** Reading category — used for filter pills (optional). */
  category:
    | "Pricing"
    | "GST & Tax"
    | "Contracts"
    | "Workflow"
    | "Money & Cashflow";
  /** Estimated reading minutes. */
  readingMinutes: number;
  /** Hero JSX-rich body. */
  body: ReactNode;
}

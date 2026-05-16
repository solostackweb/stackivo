export const siteConfig = {
  name: "Stackivo",
  description:
    "The operating system for modern independent professionals. Clients, invoices, contracts, projects, payments, time, and analytics — unified in one premium workspace with GST-ready billing for India.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/stackivo",
    github: "https://github.com/stackivo",
  },
} as const;

export type SiteConfig = typeof siteConfig;

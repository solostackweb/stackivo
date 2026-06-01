export const siteConfig = {
  name: "Stackivo",
  description:
    "Run your entire business from one workspace. Stackivo unifies clients, projects, tasks, documents, team collaboration, automations, and AI-powered workflows for freelancers, agencies, startups, and growing teams.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    twitter: "https://twitter.com/stackivo",
    github: "https://github.com/stackivo",
  },
} as const;

export type SiteConfig = typeof siteConfig;

import { defineConfig, type HeadConfig } from "vitepress";

const SITE_URL = "https://btravers.github.io";
const SITE_NAME = "Benoit TRAVERS";
const DEFAULT_DESCRIPTION =
  "Freelance software engineer and architect specializing in distributed systems, backend development, and event-driven architectures.";
const OG_IMAGE = `${SITE_URL}/logo.svg`;

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Benoit TRAVERS",
  url: SITE_URL,
  jobTitle: "Software Engineer & Architect",
  description: DEFAULT_DESCRIPTION,
  sameAs: [
    "https://github.com/btravers",
    "https://linkedin.com/in/btraversfr",
    "https://x.com/Benoit_Travers",
  ],
  knowsAbout: [
    "Distributed Systems",
    "Microservices",
    "Event-Driven Architecture",
    "Contract Testing",
    "TypeScript",
    "Java",
    "Kotlin",
  ],
};

export default defineConfig({
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  lang: "en-US",
  base: "/",
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["README.md"],

  sitemap: {
    hostname: `${SITE_URL}/`,
  },

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Home", link: "/" },
      { text: "Projects", link: "/projects" },
      { text: "Blog", link: "/blog/" },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/btravers" },
      { icon: "linkedin", link: "https://linkedin.com/in/btraversfr" },
    ],

    footer: {
      message: "Built with VitePress",
      copyright: `© ${new Date().getFullYear()} Benoit TRAVERS`,
    },
  },

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "author", content: SITE_NAME }],
    ["meta", { name: "theme-color", content: "#0f766e" }],
    [
      "meta",
      {
        name: "google-site-verification",
        content: "u6ZPW5bWbP9G1yF5Sv7B4fSOJm5rLbZWeH858tmisTc",
      },
    ],

    // Open Graph defaults — per-page values are injected by transformHead.
    ["meta", { property: "og:site_name", content: SITE_NAME }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:locale", content: "en_US" }],
    ["meta", { property: "og:image", content: OG_IMAGE }],

    // Twitter Card defaults
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "twitter:site", content: "@Benoit_Travers" }],
    ["meta", { name: "twitter:creator", content: "@Benoit_Travers" }],
    ["meta", { name: "twitter:image", content: OG_IMAGE }],

    // Person structured data
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify(personJsonLd),
    ],
  ],

  transformHead({ pageData, siteData }) {
    const tags: HeadConfig[] = [];

    const title =
      pageData.frontmatter.title ??
      (pageData.title
        ? `${pageData.title} — ${SITE_NAME}`
        : siteData.title);
    const description =
      pageData.frontmatter.description ??
      pageData.description ??
      siteData.description;

    const relPath = pageData.relativePath
      .replace(/index\.md$/, "")
      .replace(/\.md$/, "");
    const url = `${SITE_URL}/${relPath}`;

    tags.push(
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: description }],
      ["link", { rel: "canonical", href: url }],
    );

    return tags;
  },
});

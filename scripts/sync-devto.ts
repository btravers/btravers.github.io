#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface ArticleFrontmatter {
  title: string;
  description?: string;
  date: string;
  author?: string;
  tags?: string[];
  published?: boolean;
  devto_id?: number;
  devto_url?: string;
  canonical_url?: string;
}

interface DevToArticle {
  title: string;
  body_markdown: string;
  published: boolean;
  tags?: string[];
  description?: string;
  canonical_url?: string;
}

interface DevToArticleResponse {
  id: number;
  url: string;
  title: string;
  published: boolean;
}

const DEVTO_API_BASE = "https://dev.to/api";
const BLOG_DIR = join(process.cwd(), "blog");

function parseMarkdownWithFrontmatter(content: string): {
  frontmatter: ArticleFrontmatter;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error("No frontmatter found in markdown file");
  }

  const frontmatterText = match[1];
  const body = match[2].trim();

  // Parse YAML-like frontmatter
  const frontmatter: any = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Parse arrays
    if (value.startsWith("[") && value.endsWith("]")) {
      const arrayContent = value.slice(1, -1);
      frontmatter[key] = arrayContent
        .split(",")
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ""));
    }
    // Parse numbers
    else if (/^\d+$/.test(value)) {
      frontmatter[key] = parseInt(value, 10);
    }
    // Parse booleans
    else if (value === "true" || value === "false") {
      frontmatter[key] = value === "true";
    }
    // Parse strings
    else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter: frontmatter as ArticleFrontmatter, body };
}

function serializeFrontmatter(frontmatter: ArticleFrontmatter): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `${v}`).join(", ")}]`);
    } else if (typeof value === "string") {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

async function createOrUpdateArticle(
  apiKey: string,
  article: DevToArticle,
  articleId?: number,
): Promise<DevToArticleResponse> {
  const url = articleId ? `${DEVTO_API_BASE}/articles/${articleId}` : `${DEVTO_API_BASE}/articles`;

  const method = articleId ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ article }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to ${articleId ? "update" : "create"} article: ${response.status} ${response.statusText}\n${errorText}`,
    );
  }

  return await response.json();
}

async function syncArticle(apiKey: string, filePath: string): Promise<boolean> {
  console.log(`\nProcessing: ${filePath}`);

  const content = readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

  // Skip if no title
  if (!frontmatter.title) {
    console.log("  ⚠️  Skipping: No title in frontmatter");
    return false;
  }

  // Prepare article for Dev.to
  const devtoArticle: DevToArticle = {
    title: frontmatter.title,
    body_markdown: body,
    published: frontmatter.published !== false, // Default to true
    tags: frontmatter.tags?.slice(0, 4) || [], // Dev.to allows max 4 tags
    description: frontmatter.description,
  };

  // Add canonical URL if specified
  if (frontmatter.canonical_url) {
    devtoArticle.canonical_url = frontmatter.canonical_url;
  }

  try {
    const response = await createOrUpdateArticle(apiKey, devtoArticle, frontmatter.devto_id);

    console.log(`  ✅ ${frontmatter.devto_id ? "Updated" : "Created"} article: ${response.title}`);
    console.log(`     URL: ${response.url}`);
    console.log(`     ID: ${response.id}`);

    // Update frontmatter with Dev.to ID and URL if changed
    if (frontmatter.devto_id !== response.id || frontmatter.devto_url !== response.url) {
      frontmatter.devto_id = response.id;
      frontmatter.devto_url = response.url;

      const updatedContent = serializeFrontmatter(frontmatter) + "\n\n" + body + "\n";
      writeFileSync(filePath, updatedContent, "utf-8");
      console.log("     📝 Updated frontmatter with Dev.to metadata");
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  ❌ Error syncing article: ${error}`);
    throw error;
  }
}

async function main() {
  const apiKey = process.env.DEVTO_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: DEVTO_API_KEY environment variable is not set");
    console.error("\nPlease set it as a GitHub secret and ensure it's passed to this script.");
    process.exit(1);
  }

  console.log("🚀 Starting Dev.to article synchronization...");

  // Get all markdown files in blog directory, excluding index.md
  const files = readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md") && file !== "index.md")
    .map((file) => join(BLOG_DIR, file));

  if (files.length === 0) {
    console.log("ℹ️  No blog articles found to sync");
    return;
  }

  console.log(`\nFound ${files.length} article(s) to process`);

  let updated = false;
  for (const file of files) {
    try {
      const wasUpdated = await syncArticle(apiKey, file);
      updated = updated || wasUpdated;
    } catch (error) {
      console.error(`Failed to sync ${file}:`, error);
      // Continue with other files
    }
  }

  if (updated) {
    console.log("\n✅ Synchronization completed with updates");
  } else {
    console.log("\n✅ Synchronization completed (no updates needed)");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

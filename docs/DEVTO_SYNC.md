# Dev.to Article Synchronization

This repository is configured to automatically sync blog articles to [dev.to](https://dev.to) when changes are pushed to the main branch.

## Setup

### 1. Get Your Dev.to API Key

1. Go to [https://dev.to/settings/extensions](https://dev.to/settings/extensions)
2. Scroll down to the "DEV Community API Keys" section
3. Generate a new API key
4. Copy the API key (keep it secure!)

### 2. Add API Key to GitHub Secrets

1. Go to your repository settings: `https://github.com/btravers/btravers.github.io/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `DEVTO_API_KEY`
4. Value: Paste your Dev.to API key
5. Click "Add secret"

### 3. How It Works

The workflow automatically:

1. **Triggers** when markdown files in the `blog/` directory are pushed to the `main` branch
2. **Parses** each article's frontmatter for metadata (title, description, tags, etc.)
3. **Creates or updates** articles on Dev.to using their API
4. **Updates** the article frontmatter with `devto_id` and `devto_url` fields
5. **Commits** the updated frontmatter back to the repository

### 4. Article Frontmatter Format

Your blog articles should include frontmatter with the following fields:

```markdown
---
title: "Your Article Title"
description: "A brief description of your article"
date: 2024-12-20
author: Your Name
tags: [typescript, javascript, tutorial, webdev]
published: true
canonical_url: "https://btravers.github.io/blog/your-article"
---

Your article content here...
```

#### Frontmatter Fields

- **title** (required): The article title
- **description** (optional): A brief description (shown in article previews)
- **date** (required): Publication date in YYYY-MM-DD format
- **author** (optional): Author name
- **tags** (optional): Array of tags (max 4 tags for Dev.to)
- **published** (optional): Whether to publish the article immediately (default: true)
- **canonical_url** (optional): Canonical URL for the article (helps with SEO)
- **devto_id** (auto-added): Dev.to article ID (added automatically after sync)
- **devto_url** (auto-added): Dev.to article URL (added automatically after sync)

### 5. Manual Sync

You can manually trigger the sync workflow:

1. Go to the Actions tab in your repository
2. Select "Sync Articles to Dev.to"
3. Click "Run workflow"

### 6. Local Testing

To test the sync script locally:

```bash
# Set your Dev.to API key
export DEVTO_API_KEY=your-api-key-here

# Run the sync script
pnpm run sync:devto
```

## Workflow Details

The synchronization is handled by `.github/workflows/sync-devto.yml` and runs:

- **On push**: When markdown files in `blog/` are modified
- **Manually**: Via the GitHub Actions UI
- **Commits back**: Updates article metadata automatically with `[skip ci]` to prevent loops

## Future Enhancements

- LinkedIn article publishing (planned)
- Medium integration (planned)
- Article preview before publishing
- Automatic image upload to Dev.to
- Cross-posting status dashboard

## Troubleshooting

### Articles aren't syncing

1. Check that `DEVTO_API_KEY` is set in GitHub Secrets
2. Check the Actions tab for workflow run logs
3. Ensure articles have required frontmatter fields (at least `title`)
4. Verify the API key has proper permissions

### Changes not committed back

The workflow should commit changes with the message "chore: update dev.to article IDs [skip ci]". If this doesn't happen:

1. Check workflow permissions in `.github/workflows/sync-devto.yml`
2. Ensure the repository allows GitHub Actions to create commits
3. Check workflow logs for git commit errors

## Resources

- [Dev.to API Documentation](https://developers.forem.com/api/)
- [VitePress Documentation](https://vitepress.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

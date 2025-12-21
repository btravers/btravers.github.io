# Dev.to Article Synchronization - Implementation Summary

## Overview

This implementation adds automatic synchronization of blog articles from your GitHub repository to dev.to when articles are committed to the main branch.

## What Was Implemented

### 1. GitHub Actions Workflow
**File**: `.github/workflows/sync-devto.yml`

The workflow:
- Triggers automatically when markdown files in `blog/` are pushed to main
- Can also be manually triggered via GitHub Actions UI
- Runs the sync script to publish/update articles
- Commits updated frontmatter back to the repository

### 2. Sync Script
**File**: `scripts/sync-devto.ts`

A TypeScript script that:
- Parses markdown files with YAML frontmatter
- Calls the dev.to API to create or update articles
- Updates article frontmatter with `devto_id` and `devto_url`
- Handles errors gracefully and provides detailed logging

### 3. Documentation
**Files**: 
- `docs/DEVTO_SYNC.md` - Complete setup and usage guide
- `docs/LINKEDIN_SYNC.md` - Future LinkedIn integration placeholder
- Updated `README.md` with feature description

### 4. Package Updates
- Added `tsx` dependency for running TypeScript scripts
- Added `sync:devto` npm script
- Updated pnpm workspace catalog

## Next Steps for You

### 1. Set Up Dev.to API Key

1. Go to https://dev.to/settings/extensions
2. Generate a new API key
3. Go to your repository settings: https://github.com/btravers/btravers.github.io/settings/secrets/actions
4. Create a new secret named `DEVTO_API_KEY` with your API key

### 2. Merge This PR

Once you merge this PR to main:
- The workflow will be active
- Any changes to blog articles will trigger automatic sync
- Existing articles will be synced on the first run

### 3. Monitor the First Sync

After merging:
1. Go to the Actions tab in your repository
2. You'll see "Sync Articles to Dev.to" workflow run
3. Check the logs to verify successful sync
4. The workflow will commit back the `devto_id` and `devto_url` to your article frontmatter

### 4. Write New Articles

When writing new articles:
```markdown
---
title: "Your Article Title"
description: "Brief description"
date: 2024-12-21
author: Your Name
tags: [typescript, javascript, webdev]
published: true
canonical_url: "https://btravers.github.io/blog/your-article"
---

Your article content...
```

After pushing to main, the article will automatically appear on dev.to!

## Features

✅ **Automatic Sync**: Articles sync automatically when pushed to main  
✅ **Update Support**: Edit articles locally and changes sync to dev.to  
✅ **Manual Trigger**: Can manually trigger sync via GitHub Actions  
✅ **Metadata Tracking**: Article IDs and URLs saved in frontmatter  
✅ **Canonical URLs**: Support for SEO-friendly canonical URLs  
✅ **Tag Support**: Up to 4 tags per article  
✅ **Error Handling**: Graceful error handling with detailed logs  
✅ **[skip ci] Commits**: Metadata commits don't trigger unnecessary builds

## Testing

All checks passing:
- ✅ Linter (oxlint)
- ✅ Type check (TypeScript)
- ✅ Build (VitePress)
- ✅ Format (oxfmt)

Tested scenarios:
- Frontmatter parsing (including edge cases)
- Empty arrays
- Complex tag values with spaces
- Serialization/deserialization

## Future Enhancements

As mentioned in the requirements:
- **LinkedIn Publishing**: Placeholder docs created at `docs/LINKEDIN_SYNC.md`
- Can be implemented following the same pattern as dev.to sync

## Files Changed

```
.github/workflows/sync-devto.yml   (new) - Workflow definition
scripts/sync-devto.ts              (new) - Sync script
docs/DEVTO_SYNC.md                 (new) - Documentation
docs/LINKEDIN_SYNC.md              (new) - Future integration docs
README.md                          (modified) - Updated with feature info
package.json                       (modified) - Added sync script and tsx
pnpm-workspace.yaml                (modified) - Added tsx to catalog
pnpm-lock.yaml                     (modified) - Lockfile update
blog/introducing-amqp-contract.md  (modified) - Added canonical_url
```

## Support

For issues or questions:
1. Check `docs/DEVTO_SYNC.md` for troubleshooting
2. Review workflow logs in GitHub Actions
3. Verify `DEVTO_API_KEY` is set correctly

---

**Ready to go!** Just add the `DEVTO_API_KEY` secret and merge this PR. 🚀

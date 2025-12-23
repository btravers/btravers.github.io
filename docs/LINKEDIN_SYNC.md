# Future: LinkedIn Article Publishing

This document outlines the planned implementation for syncing blog articles to LinkedIn.

## Status

🚧 **Coming Soon** - Not yet implemented

## Planned Features

- [ ] Automatic sync to LinkedIn on push
- [ ] Create articles via LinkedIn API
- [ ] Support for LinkedIn-specific formatting
- [ ] Article cover image upload
- [ ] Track LinkedIn article URLs in frontmatter
- [ ] Manual workflow trigger

## Implementation Notes

### LinkedIn API Requirements

1. **OAuth 2.0 Authentication**: LinkedIn uses OAuth 2.0 for API access
   - Requires creating a LinkedIn App
   - Needs authorization from the user (personal account or organization)
   - Access token management

2. **API Endpoints**:
   - Create post: `POST https://api.linkedin.com/v2/ugcPosts`
   - Create article: `POST https://api.linkedin.com/v2/articles` (may require special access)

3. **Content Format**:
   - LinkedIn has specific formatting requirements
   - Maximum character limits
   - Image/media handling differences from Dev.to

### Frontmatter Extensions

Additional fields for LinkedIn:

```yaml
---
title: "Article Title"
description: "Article description"
linkedin_published: true
linkedin_post_id: "urn:li:share:123456789"
linkedin_url: "https://www.linkedin.com/posts/..."
---
```

## Workflow Structure

Similar to `sync-devto.yml`:

```yaml
name: Sync Articles to LinkedIn

on:
  push:
    branches:
      - main
    paths:
      - 'blog/**/*.md'
      - '!blog/index.md'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync-to-linkedin:
    name: Sync to LinkedIn
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup
        uses: ./.github/actions/setup

      - name: Sync articles to LinkedIn
        env:
          LINKEDIN_ACCESS_TOKEN: ${{ secrets.LINKEDIN_ACCESS_TOKEN }}
        run: pnpm run sync:linkedin

      - name: Commit updated article metadata
        run: |
          # Commit LinkedIn metadata back to repo
```

## Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [LinkedIn Share API](https://docs.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin)
- [OAuth 2.0 with LinkedIn](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)

## Contributing

If you'd like to help implement LinkedIn integration, please:

1. Review the LinkedIn API documentation
2. Test the OAuth flow locally
3. Create a prototype sync script similar to `scripts/sync-devto.ts`
4. Submit a PR with the implementation

---

**Note**: This is a placeholder for future development. The implementation will follow after Dev.to sync is stable and tested.

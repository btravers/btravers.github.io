# btravers.github.io

My personal website built with VitePress.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- pnpm (v9 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/btravers/btravers.github.io.git
cd btravers.github.io

# Install dependencies
pnpm install
```

### Development

Run the development server:

```bash
pnpm run docs:dev
```

The site will be available at `http://localhost:5173`

### Build

Build the site for production:

```bash
pnpm run docs:build
```

The built files will be in `.vitepress/dist`

### Preview

Preview the production build locally:

```bash
pnpm run docs:preview
```

## 🚀 Deployment

The site is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow is configured in `.github/workflows/deploy.yml`.

To manually trigger a deployment, go to the Actions tab in the GitHub repository and run the "Deploy VitePress site to GitHub Pages" workflow.

## 📝 Blog and Article Publishing

Blog articles in the `blog/` directory are automatically synced to [Dev.to](https://dev.to) when pushed to the `main` branch.

### Features

- ✅ Automatic sync to Dev.to on push
- ✅ Create new articles or update existing ones
- ✅ Preserve article metadata (IDs, URLs)
- ✅ Support for tags, descriptions, and canonical URLs
- ✅ Manual workflow trigger option

For setup instructions and detailed documentation, see [docs/DEVTO_SYNC.md](./docs/DEVTO_SYNC.md).

### Quick Setup

1. Get your Dev.to API key from [Dev.to Settings](https://dev.to/settings/extensions)
2. Add it as `DEVTO_API_KEY` in GitHub Secrets
3. Push changes to blog articles - they'll automatically sync!

**Future:** LinkedIn article publishing coming soon.

## 📁 Project Structure

```
.
├── .github/
│   ├── actions/
│   │   └── setup/         # Reusable setup action
│   └── workflows/
│       ├── ci.yml         # CI workflow (format, lint, type-check, build)
│       ├── deploy.yml     # GitHub Pages deployment workflow
│       └── sync-devto.yml # Dev.to article sync workflow
├── .vitepress/            # VitePress configuration
│   └── config.ts          # Site configuration
├── blog/                  # Blog articles (markdown)
│   ├── index.md           # Blog index page
│   └── *.md               # Blog articles
├── docs/                  # Documentation
│   └── DEVTO_SYNC.md      # Dev.to sync documentation
├── scripts/               # Build and automation scripts
│   └── sync-devto.ts      # Dev.to sync script
├── index.md               # Homepage
├── projects.md            # Projects page
├── package.json           # Dependencies and scripts
├── pnpm-workspace.yaml    # pnpm workspace and catalog configuration
└── README.md              # This file
```

## 🛠️ Technology Stack

- [VitePress](https://vitepress.dev/) - Static Site Generator
- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling

## 📝 License

MIT

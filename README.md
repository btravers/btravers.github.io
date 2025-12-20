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

## 📁 Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions deployment workflow
├── .vitepress/           # VitePress configuration
│   └── config.js         # Site configuration
├── index.md              # Homepage
├── about.md              # About page
├── projects.md           # Projects page
├── contact.md            # Contact page
├── package.json          # Dependencies and scripts
├── pnpm-workspace.yaml   # pnpm workspace and catalog configuration
└── README.md             # This file
```

## 🛠️ Technology Stack

- [VitePress](https://vitepress.dev/) - Static Site Generator
- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling

## 📝 License

MIT

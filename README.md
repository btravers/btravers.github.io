# btravers.github.io

My personal website built with VitePress.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/btravers/btravers.github.io.git
cd btravers.github.io

# Install dependencies
npm install
```

### Development

Run the development server:

```bash
npm run docs:dev
```

The site will be available at `http://localhost:5173`

### Build

Build the site for production:

```bash
npm run docs:build
```

The built files will be in `.vitepress/dist`

### Preview

Preview the production build locally:

```bash
npm run docs:preview
```

## 📁 Project Structure

```
.
├── .vitepress/          # VitePress configuration
│   └── config.js        # Site configuration
├── index.md             # Homepage
├── about.md             # About page
├── projects.md          # Projects page
├── contact.md           # Contact page
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## 🛠️ Technology Stack

- [VitePress](https://vitepress.dev/) - Static Site Generator
- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling

## 📝 License

MIT
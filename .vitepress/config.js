import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Benoit TRAVERS",
  description: "Personal website",
  base: '/',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/btravers' },
      { icon: 'linkedin', link: 'https://linkedin.com/in/btraversfr' }
    ],
    footer: {
      message: 'Built with VitePress',
      copyright: `Copyright © ${new Date().getFullYear()} btravers`
    }
  }
})

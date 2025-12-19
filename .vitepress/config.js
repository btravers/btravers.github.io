import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "btravers",
  description: "Personal website",
  base: '/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about' },
      { text: 'Projects', link: '/projects' },
      { text: 'Contact', link: '/contact' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/btravers' }
    ],
    footer: {
      message: 'Built with VitePress',
      copyright: 'Copyright © 2024 btravers'
    }
  }
})

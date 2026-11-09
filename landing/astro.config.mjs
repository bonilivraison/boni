import { defineConfig } from 'astro/config';

// Site 100 % statique. Sur GitHub Pages, le workflow fournit SITE_URL et BASE_PATH
// (https://bonilivraison.github.io + /boni). En local, le site est servi à la racine.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://bonilivraison.github.io',
  base: process.env.BASE_PATH ?? '/',
  output: 'static',
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
});

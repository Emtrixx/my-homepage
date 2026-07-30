// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jesseguenzl.com',

  // The prebuilt mandelbrot bundle (webpack 4) hardcodes __webpack_require__.p = "",
  // so it resolves its chunk and .wasm against the *document* URL. Without the
  // trailing slash, /mandelbrot resolves them to the site root and 404s.
  trailingSlash: 'always',

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    // tokyo-night's background (#1a1b26) sits closest to --color-deep; the
    // .prose pre rule overrides the bg with the actual token anyway.
    shikiConfig: { theme: 'tokyo-night' },
  },

  // These cssVariables are deliberately NOT --font-display/-body/-mono: those
  // names belong to Tailwind's @theme, and two :root declarations of the same
  // custom property would silently fight in the cascade. global.css aliases
  // the Tailwind names onto these.
  fonts: [
    {
      // Vendored rather than fetched from Google: the Google CSS2 API serves
      // Anybody with only the wght axis, and this design leans on wdth for the
      // hero. The `standard` Fontsource file carries wdth[50..150] + wght.
      provider: fontProviders.local(),
      name: 'Anybody',
      cssVariable: '--font-anybody',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            weight: '100 900',
            style: 'normal',
            src: ['./src/assets/fonts/anybody-latin-standard-normal.woff2'],
          },
        ],
      },
    },
    {
      provider: fontProviders.google(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      fallbacks: ['Georgia', 'serif'],
      weights: ['300 700'],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex',
      fallbacks: ['ui-monospace', 'monospace'],
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
    },
  ],
});

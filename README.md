# jesseguenzl.com

Personal site. Static Astro + Tailwind, served by nginx.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve dist/ locally
```

## Deploy

```bash
docker compose up -d --build
```

Multi-stage build: Node builds `dist/`, nginx serves it on port 80, published to
`127.0.0.1:3001` for the reverse proxy in front of it.

## The background

`src/scripts/background.ts` draws two passes into one fixed canvas:

1. A fullscreen triangle running `src/scripts/nebula.glsl.ts` — a domain-warped
   FBM nebula plus three parallax star layers. One draw call, no textures.
2. A lit moon whose **phase tracks scroll position**: a thin crescent at the
   hero, full by the contact section. The sun direction is built in the
   moon→camera frame, not world space, because the moon sits far off-axis in the
   page's right gutter.

The moon is sized to that gutter and hidden below roughly 1280px wide, where
there is no gutter to put it in. The canvas is fixed, so anything it overlaps it
overlaps for the whole scroll — a full moon behind body copy is unreadable.

Respects `prefers-reduced-motion`: no animation loop, no time advance. Scroll
still repaints, since that is the reader's own movement.

## WASM demos

`/mandelbrot/` and `/raytracer/` are prebuilt bundles from separate repos,
checked in under `public/` and served as-is.

- Rebuild them at [Emtrixx/mandelbrot_wasm](https://github.com/Emtrixx/mandelbrot_wasm)
  and [Emtrixx/raytracer_wasm](https://github.com/Emtrixx/raytracer_wasm), then
  copy the output into `public/<name>/`.
- The Astro pages must reproduce the element ids the bundles query
  (`#mandelbrotwasm-canvas`, `width`, `height`, `centX`, `centY`, `scale`,
  `iterations`; `#raytracerwasm-canvas`, `brightness`, `brightness-value`).
- **The mandelbrot bundle hardcodes `__webpack_require__.p = ""`**, so it fetches
  its chunk and `.wasm` relative to the document URL. It only works at
  `/mandelbrot/` *with* the trailing slash. Hence `trailingSlash: 'always'` in
  `astro.config.mjs`, the `<base href="/mandelbrot/">` on that page, and the
  redirect in `nginx.conf`. Removing any of the three breaks it.
- Both bundles were built with webpack's `eval` devtool, so the CSP in
  `security-headers.conf` needs `script-src 'unsafe-eval'`. Rebuilding them
  without that devtool would let it go.

## Fonts

Self-hosted via `astro:fonts`. Anybody is vendored in `src/assets/fonts/` rather
than fetched from Google, because Google's API serves it with only the `wght`
axis and the hero uses `wdth`. Newsreader and IBM Plex Mono come from Google.

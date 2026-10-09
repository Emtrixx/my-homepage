# jesseguenzl.com

Personal site. Static Astro + Tailwind, served by nginx.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve dist/ locally
```

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`: install dependencies, type-check,
build, verify the static pages and WASM assets, then deploy over SSH from a GitHub-hosted
runner. Pull requests run the build checks only. The workflow can also be run manually.

Like `gebr-schulz-website`, deployment uses the `deploy` account on the server. Repository
variables: `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, and `DEPLOY_PATH` (the absolute
server checkout path). Repository secrets: `DEPLOY_SSH_KEY` (the local `github-deploy`
private key) and `DEPLOY_KNOWN_HOSTS` (the trusted SSH host entry). Keys stay out of Git.

`scripts/deploy.sh` locks the server checkout, fast-forwards `main` to the commit that
passed CI, skips superseded runs, and rebuilds the `homepage` service before replacing
the running container. The checkout must belong to the deployment account and have no
tracked local changes. Keep server-specific settings in `.env` or `compose.override.yaml`.

To rebuild manually on the server:

```bash
docker compose up -d --build
```

Multi-stage build: Node builds `dist/`, nginx serves it on port 80, published to
`127.0.0.1:3001` for the reverse proxy in front of it.

## Home Assistant

`/homeassistant/` is the public JesseHomeAssistant OAuth application homepage. It describes
the personal Google Calendar and Google Tasks integration and links to `/impressum` for
the privacy policy.

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

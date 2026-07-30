# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # http://localhost:4321
npm run check    # astro check — type-checks .astro/.ts; CI runs this before build
npm run build    # -> dist/
npm run preview  # serve dist/ locally

docker compose up -d --build   # production image: node builds dist/, nginx serves it on 127.0.0.1:3001
```

There are no tests. CI (`.github/workflows/deploy.yml`) runs `check` + `build`, then asserts the WASM
demo files survived the build and that `<base href="/mandelbrot/">` is still in the emitted HTML.
Pushing to `main` triggers the `deploy` job on a self-hosted runner, which rebuilds the live site.

## Architecture

Static Astro 7 + Tailwind 4 (via `@tailwindcss/vite`, no Astro Tailwind integration). Content lives in
`src/data/projects.ts` and in the page markup; there is no CMS, router logic, or client framework.
Only `src/pages/index.astro` opts into the WebGL background (`background={true}` on `Base`); inner
pages sit on the flat `--color-void`.

### The background (`src/scripts/background.ts` + `nebula.glsl.ts`)

Two passes into one fixed canvas, `autoClear` off: a fullscreen-triangle nebula shader, then a
three.js moon. Constraints that are easy to break:

- **Moon phase tracks scroll.** `applyPhase()` builds the sun direction in the **moon→camera frame**,
  not world space — the moon sits off-axis at the golden-ratio point (0.618, 0.382), so a world-space
  angle would give the wrong illuminated fraction at both ends of the scroll.
- **The contrast budget is load-bearing.** `--color-ink` / `--color-dust` in `global.css` and the
  `DirectionalLight` intensity in `background.ts` are solved against each other so body copy crossing
  the moon clears WCAG AA (moon peak luminance ~0.07). Brightening the moon requires brightening the
  text, and vice versa. The arithmetic is in comments in both files.
- **Shader colors are sRGB, not linear.** A bare `ShaderMaterial` gets no colorspace conversion from
  three.js, so the constants in `nebula.glsl.ts` are design-token values / 255. Do not pass them
  through `THREE.Color`.
- **`prefers-reduced-motion`** disables the rAF loop entirely; scroll still repaints via
  `renderStatic()`, because the phase is a progress indicator rather than decoration.

### The prebuilt WASM demos

`public/mandelbrot/` and `public/raytracer/` are checked-in build output from
[Emtrixx/mandelbrot_wasm](https://github.com/Emtrixx/mandelbrot_wasm) and
[Emtrixx/raytracer_wasm](https://github.com/Emtrixx/raytracer_wasm). The Astro pages are hand-written
shells that must satisfy what those bundles query:

- **Mandelbrot only works at `/mandelbrot/` with the trailing slash.** Its webpack 4 build hardcodes
  `__webpack_require__.p = ""`, resolving its chunk and `.wasm` against the document URL. Three things
  defend this — `trailingSlash: 'always'` in `astro.config.mjs`, `<base href="/mandelbrot/">` on the
  page, and the `rewrite` in `nginx.conf`. Removing any one breaks it silently.
- **The mandelbrot form's field order is load-bearing**: the bundle reads `event.target[0..5]`
  positionally (width, height, centX, centY, scale, iterations). The ids must also match, for the
  keyboard handler. The raytracer bundle uses `querySelector('form')`, so its form must stay first.
- Both bundles were compiled with webpack's `eval` devtool, which is the only reason
  `script-src 'unsafe-eval'` is in `security-headers.conf`.

### Serving (`nginx.conf`, `security-headers.conf`)

Two nginx traps that fail quietly and are already worked around — don't undo them:

- `add_header` does **not** merge across levels. Any `location` with its own `add_header` discards the
  server block's headers, so every location `include`s `security-headers.conf` explicitly.
- A `types { … }` block **replaces** the whole MIME map instead of extending it. Never add one; the
  base image already maps `.wasm` and `.js` correctly.

`gzip_http_version 1.0` is set deliberately: the outer reverse proxy speaks HTTP/1.0, and nginx
refuses to gzip HTTP/1.0 responses by default — without it the three.js bundle ships uncompressed.

## Conventions

- Design system lives in `@theme` in `src/styles/global.css`. `--rust` carries emphasis,
  `--phosphor` marks interaction; never both on one element. Surfaces are flat — 2px radius, no blur,
  no glow, no shadow. Prose links change underline thickness, not color.
- Tailwind's source globs are pinned (`source(none)` + explicit `@source`) because automatic detection
  reads `.gitignore`, and Docker builds exclude `.git`, which produced different CSS there.
- Fonts go through `astro:fonts`. Anybody is vendored in `src/assets/fonts/` rather than fetched from
  Google, because Google's API omits the `wdth` axis the hero relies on. The `cssVariable` names
  (`--font-anybody` etc.) deliberately differ from the Tailwind `--font-display/body/mono` names,
  which alias onto them in `global.css` — two `:root` declarations of the same custom property would
  fight in the cascade.
- `TODO.md` is the running list of known open issues (missing OG tags/sitemap, Impressum wording,
  three.js bundle size, three unreviewed visual judgements about the moon). It carries a "verified as
  of" date and a closed-items list at the bottom — check it before starting related work, and move
  items into that list rather than deleting them.

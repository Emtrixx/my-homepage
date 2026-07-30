# Open issues

State as of 2026-07-30. The Astro migration is merged and pushed — `main` is `5e8bdcc`, identical to
`origin/main`, and the deploy has run: <https://jesseguenzl.com> serves the current build. The
`astro-migration` branch is fully merged into `main` and can be deleted.

Everything below was re-checked against the repo and the live site on 2026-07-30. What was verified
and closed is listed at the bottom, so it doesn't get raised again.

---

## Needs your eyes

Three visual judgements that no amount of arithmetic settles. None have been looked at since the moon
moved to the golden-ratio anchor.

### The hero sits on a full moon
`src/scripts/background.ts`

The lunation starts at 100% lit and the moon is anchored at (0.618, 0.382) on a *fixed* canvas, so the
headline and lede cross the brightest the moon ever gets. The contrast budget says this is fine — body
copy holds 4.98:1 against a measured peak luminance of 0.0614 — but those numbers were measured under
the old phase curve, where the hero showed a thin crescent. Open the page and look.

### The mid-page moon is a black disc
At `progress = 0.5` the moon is fully unlit, carried only by the earthshine
`AmbientLight(0x2a3350, 0.06)`. Against the void it may read as a hole rather than a moon. If it looks
wrong, raise the ambient — there is headroom (peak 0.0614 against a ceiling of 0.0733) before body text
drops below 4.5:1.

### Mobile has never been screenshotted since the moon moved
The moon scales to 16% of the short edge, so it appears on phones again — it was hidden below 1280px
under the old gutter layout. At 390×844 it lands near the hero heading.

> Before changing any of the three: `--color-ink` and `--color-dust` in `src/styles/global.css` are
> solved against the moon's brightness so text crossing it clears WCAG AA. Brighten the moon and the
> text must brighten too; darken the text and the moon must darken. The arithmetic is in the comments
> in both files.

---

## Content

### Project screenshots
`public/images/`

`mingleflix.webp` and `FridgeMate.jpg` are still the original bright logos/screenshots on white, and
they punch a hole in a dark page. The CSS filter in `FeaturedProject.astro`
(`opacity .88 / saturate .85`) only softens it. Real in-context screenshots would serve you better.

### Copy written for you, which you should read as your own
`src/data/projects.ts`, `src/pages/index.astro`

Close to your original wording, but every sentence on that page is a claim with your name on it.

### Impressum
`src/pages/impressum.astro`

- **Line 76 still says "unseres Datenschutzbeauftragten"** (our data protection officer). You almost
  certainly don't have one. Inherited from the original activeMind template. (The activeMind
  attribution at the bottom of the file is their template's licence condition — leave that one alone.)
- Your home address and mobile number are on a public page. Required by § 5 TMG for a commercial site;
  whether this site counts is worth knowing.

---

## Technical debt

### `unsafe-eval` is still in the CSP
`security-headers.conf`

Both WASM bundles were compiled with webpack's `eval` devtool, so every module is wrapped in
`eval("…")`. Rebuilding `mandelbrot_wasm` and `raytracer_wasm` with a non-eval `devtool` would let
`script-src` drop to just `'self'`.

### The mandelbrot bundle is fragile
`public/mandelbrot/bootstrap.js` hardcodes `__webpack_require__.p = ""` and resolves its chunk and
`.wasm` against the *document* URL. Three separate things defend it: `trailingSlash: 'always'`, the
`<base href="/mandelbrot/">` on the page, and the redirect in `nginx.conf`. Remove any one and it
breaks. The real fix is to rebuild it with `output.publicPath = '/mandelbrot/'` (or `'auto'`, which is
what the raytracer's webpack 5 build already does correctly).

The form on that page is fragile for a second, unrelated reason: the bundle reads it *positionally*
(`event.target[0..5]`), so the field order is load-bearing. Documented in a comment on the page.

### three.js is 128 KB gzipped for one sphere
`WebGLRenderer` is the floor — it drags in the whole shader chunk library and does not tree-shake away.
The scene needs a lit, normal-mapped sphere and a fullscreen quad, both achievable in a couple hundred
lines of raw WebGL2. Only worth it if you care; the current size is not unreasonable.

### Missing meta
No `robots.txt`, no `sitemap.xml` (`@astrojs/sitemap` is one line of config), and no Open Graph or
Twitter card tags in `src/layouts/Base.astro`, so links to the site preview as bare text. The blog
(added 2026-07-30) makes this more pressing: blog posts are exactly the pages that get shared as
links, and a sitemap should now cover `/blog/` and the posts.

### The doom easter egg is desktop-only by design
`src/scripts/doom-trigger.ts` gates on `(pointer: fine)` because the game needs the Pointer Lock
API; on touch devices the trapdoor glyph stays inert decoration. Touch controls are explicitly out
of scope for v1. Also untested: the capture path (`modern-screenshot`) across browsers — verified in
Chromium; Firefox and Safari deserve a manual pass of the full fall→game→restore loop.

### Assets
`public/3d/moon/normal.jpg` is 212 KB and the largest asset on the page — already down from 911 KB, but
it could go to WebP. Don't crush the quality: lossy artifacts in a normal map show up as shading noise
on the terminator, which is exactly where the eye goes.

### No tests
Nothing guards the things that broke during the migration. CI asserts the WASM files exist and that the
`<base>` tag is present, which is the bare minimum. A Playwright smoke test driving both demo canvases
would cover the rest — and could now also assert the blog routes build (`/blog/`, one post, `/rss.xml`)
and that the doom trigger script is absent from non-doom posts.

### The README describes the old background
`README.md`

Its "The background" section still says the moon is "a thin crescent at the hero, full by the contact
section", sized to the right gutter and hidden below 1280px. The lunation now runs full → new → full,
and the moon is anchored at the golden-ratio point and scaled to the short edge, so it shows on phones.
Two paragraphs to rewrite.

---

## Deploy

### Tidy the outer reverse proxy
Your server-level nginx (the one holding the Certbot certs) proxies to `localhost:3001`. Three things
worth fixing, none of them breaking anything today:

1. **`proxy_http_version 1.1;`** — `proxy_pass` speaks HTTP/1.0 by default. Compression is confirmed
   working live, because the container sets `gzip_http_version 1.0` to compensate, so this is now only
   about restoring keepalive to the backend.
2. **`client_max_body_size 10000M;`** — a 10 GB request-body limit left over from the PDF upload tool.
   Nothing on this site accepts uploads any more. Drop it, or set it to something like `1m`.
3. **The Certbot cert does not cover `www`.** `https://www.jesseguenzl.com` fails TLS outright:
   *no alternative certificate subject name matches target host name*. Re-issue with the `www` SAN, or
   drop the `www` DNS record so it fails fast instead of on a certificate warning.
   (The old "`http://www` returns 404" note is fixed — it now 301s to `https://jesseguenzl.com/`.)

Optionally add `proxy_set_header Host $host;` and `X-Forwarded-For`, so the container's access log
records the real client IP rather than `127.0.0.1`. The Datenschutzerklärung describes logging IP
addresses; today only the outer nginx actually sees them.

---

## Verified and closed on 2026-07-30

Checked against the live site, so these no longer need a manual pass:

- The deploy job ran and `https://jesseguenzl.com` serves the current build (HTTP 200).
- `/mandelbrot` (no slash) 301s to `/mandelbrot/`.
- `/_astro/*.js` arrives as `application/javascript` — not `application/octet-stream` — with
  `Cache-Control: public, max-age=31536000, immutable`.
- The CSP header is present on `/` as well as on the asset routes, so the `add_header` inheritance trap
  is genuinely handled.
- HTML and JS both arrive `Content-Encoding: gzip` through the reverse proxy.
- `http://www.jesseguenzl.com` 301s to the canonical host.
- The Foodsharing link (`git.lumos.city/haw-ms/neighborhood-foodsharing`) still resolves — HTTP 200.
- The cookie/consent paragraph in the Impressum is accurate: no cookies, no tracking, no third-party
  requests.

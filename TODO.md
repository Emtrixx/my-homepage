# Open issues

State as of the `astro-migration` branch. Nothing has been pushed and `main` is
untouched.

---

## Look at these before merging

### The hero now sits on a full moon
`src/scripts/background.ts`

The lunation starts at 100% lit, and the moon is anchored at the golden-ratio
point (0.618, 0.382) on a *fixed* canvas — so the headline and lede cross the
brightest the moon ever gets. The contrast budget says this is fine (body copy
holds 4.98:1 against a measured peak luminance of 0.0614), but the numbers were
measured under the old phase curve, where the hero showed a thin crescent. Open
the page and check the hero with your own eyes.

### The mid-page moon is a black disc
At `progress = 0.5` the moon is fully unlit, carried only by the earthshine
`AmbientLight(0x2a3350, 0.06)`. Against the void it will be close to invisible —
possibly reading as a hole rather than a moon. If it looks wrong, raise the
ambient a little; there is headroom (peak 0.0614 against a ceiling of 0.0733)
before body text drops below 4.5:1.

### Mobile has not been re-checked since the moon moved
The moon now scales to 16% of the short edge, so it appears on phones again — it
was hidden below 1280px in the gutter layout. At 390×844 it lands near the hero
heading. Never screenshotted after the change.

### The contrast budget is load-bearing
`src/styles/global.css`

`--color-ink` and `--color-dust` are not free choices. They are set so text
crossing the moon clears WCAG AA. If you darken the text, the moon must get
darker too; if you brighten the moon, the text must get brighter. The arithmetic
is in the comments in both files. The old `--color-dust` (`#8A8578`) would have
required a moon peak of `L = 0.013`, which is no moon at all.

---

## Content you need to verify or replace

### Project screenshots
`public/images/`

`mingleflix.webp` and `FridgeMate.jpg` are bright logos/screenshots on white.
They punch a hole in a dark page. The CSS filter in `FeaturedProject.astro`
(`opacity .88 / saturate .85`) only softens it. Real in-context screenshots
would serve you much better.

### Copy I wrote, which you should still read as your own
`src/data/projects.ts`, `src/pages/index.astro`

The FridgeMate model is corrected to cloud-served. The rest is now close to your
original wording, but every sentence on that page is a claim with your name on
it. Re-read it.

### Dead or unverified links
- `https://git.lumos.city/haw-ms/neighborhood-foodsharing` (Foodsharing) — never
  checked that it still resolves.
- Yelp Camp was cut entirely; its Heroku app is long dead anyway. The old
  FridgeMate card pointed at that same dead Heroku URL, which is why it's gone.

### Impressum needs a human, not a lawyer-shaped guess
`src/pages/impressum.astro`

- The cookie/consent paragraph is replaced with an accurate statement: no
  cookies, no tracking, no third-party requests. I verified that empirically —
  loading all four pages contacts only the site's own origin and sets zero
  cookies.
- **Still says "unseres Datenschutzbeauftragten"** (our data protection officer).
  You almost certainly don't have one. That wording is inherited from the
  original activeMind template.
- Your home address and mobile number are on a public page. Required by § 5 TMG
  for a commercial site; whether this site counts is worth knowing.

---

## Technical debt

### `unsafe-eval` is still in the CSP
`security-headers.conf`

Both WASM bundles were compiled with webpack's `eval` devtool, so every module is
wrapped in `eval("…")`. Rebuilding `mandelbrot_wasm` and `raytracer_wasm` with a
non-eval `devtool` would let `script-src` drop to just `'self'`.

### The mandelbrot bundle is fragile
`public/mandelbrot/bootstrap.js` hardcodes `__webpack_require__.p = ""` and
resolves its chunk and `.wasm` against the *document* URL. This is why it was
silently broken in production before, and why three separate things now defend
it: `trailingSlash: 'always'`, the `<base href="/mandelbrot/">` on the page, and
the redirect in `nginx.conf`. Remove any one and it breaks.

The real fix is to rebuild it with `output.publicPath = '/mandelbrot/'` (or
`'auto'`, which is what the raytracer's webpack 5 build already does correctly).

### three.js is 128 KB gzipped for one sphere
`WebGLRenderer` is the floor — it drags in the whole shader chunk library and
does not tree-shake away. The scene needs a lit, normal-mapped sphere and a
fullscreen quad. Both are achievable in a couple hundred lines of raw WebGL2,
which would cut the page's JS to near nothing. Only worth it if you care; the
current size is not unreasonable.

### Missing meta
- No `robots.txt`, no `sitemap.xml` (`@astrojs/sitemap` is one line of config).
- No Open Graph or Twitter card tags, so links to the site preview as bare text.

### Assets
`public/3d/moon/normal.jpg` is 212 KB and now the largest asset on the page —
already down from 911 KB, but it could go to WebP. Don't crush the quality:
lossy artifacts in a normal map show up as shading noise on the terminator,
which is exactly where the eye goes.

### No tests
There is nothing guarding the things that broke during the migration: the
WASM demos loading, the trailing-slash redirect, the CSP headers, the MIME
types. The CI build job asserts the WASM files exist and that the `<base>` tag is
present, which is the bare minimum. A Playwright smoke test driving both demo
canvases would cover the rest.

---

## Deploy

### Tidy the outer reverse proxy
Your server-level nginx (the one holding the Certbot certs) proxies to
`localhost:3001`. It works as-is — this container's redirects are relative
(`absolute_redirect off`), so `/mandelbrot` → `/mandelbrot/` resolves against the
public host rather than leaking `localhost`. Three things to fix anyway:

1. **`proxy_http_version 1.1;`** — `proxy_pass` speaks HTTP/1.0 by default, and
   nginx refuses to gzip HTTP/1.0 responses (`gzip_http_version` defaults to
   1.1). The container now sets `gzip_http_version 1.0` to compensate, so
   compression works either way, but setting this upstream also restores
   keepalive to the backend.
2. **`client_max_body_size 10000M;`** — a 10 GB request-body limit, left over
   from the PDF upload tool. Nothing on this site accepts uploads any more. Drop
   it, or set it to something like `1m`.
3. **`http://www.jesseguenzl.com` returns 404.** The port-80 block only redirects
   when `$host = jesseguenzl.com`, so the `www` variant never reaches the 301.
   And `https://www.…` only works if the Certbot cert actually covers the `www`
   SAN — worth confirming with
   `openssl s_client -connect jesseguenzl.com:443 | openssl x509 -noout -text | grep DNS`.
   Both predate this migration.

Optionally add `proxy_set_header Host $host;` and `X-Forwarded-For`, so the
container's access log records the real client IP rather than `127.0.0.1`. The
Datenschutzerklärung describes logging IP addresses; today only the outer nginx
actually sees them.

### The first merge to `main` will redeploy the live site
`.github/workflows/deploy.yml`

The `deploy` job runs on `push` to `main` against the self-hosted runner and does
`docker compose down && docker compose up -d --build`. The old workflow was
entirely commented out, so this has been dormant for a long time. Confirm the
runner is alive and that its working directory still matches before you merge.

### Verify once on the server
The container was tested locally (`docker compose up --build`, port 3001, same as
before). On the box, confirm:
- the reverse proxy still reaches it on `127.0.0.1:3001`
- `/mandelbrot` (no slash) 301s to `/mandelbrot/`
- `/_astro/*.js` arrives as `application/javascript`, not `application/octet-stream`
- the CSP header is present on `/`, not just on the asset routes

Those last two are nginx traps I hit while building this: a `types { … }` block
replaces the entire MIME map instead of extending it, and an `add_header` inside
a `location` silently discards every `add_header` inherited from the server
block. Both are fixed, but they fail quietly, so they are worth one manual check
against the real deployment.

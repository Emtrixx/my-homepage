// Fullscreen-triangle background: domain-warped FBM nebula + three parallax
// star layers. One draw call, zero texture bytes.
//
// Colour note: three.js only injects the sRGB output conversion into materials
// that `#include <colorspace_fragment>`. A bare ShaderMaterial's output is
// written to the framebuffer untouched, so these constants are the sRGB values
// from the design tokens divided by 255 — not linear-light. Do not feed them
// through THREE.Color, which would convert them to linear and render too dark.

export const vertexShader = /* glsl */ `
  varying vec2 vPos;

  void main() {
    vPos = position.xy;
    // Bypass the camera matrices entirely; the triangle is already in clip space.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vPos;

  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uPointer;   // -1..1, already smoothed on the CPU
  uniform float uScroll;    // 0..1 document progress

  const vec3 VOID     = vec3(0.0392, 0.0549, 0.1020); // #0A0E1A
  const vec3 DEEP     = vec3(0.0824, 0.1059, 0.1804); // #151B2E
  const vec3 RUST     = vec3(0.7686, 0.3333, 0.2275); // #C4553A
  const vec3 PHOSPHOR = vec3(0.4980, 0.6902, 0.6392); // #7FB0A3

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Three octaves. A fourth is not visible at the opacity the nebula runs at.
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = rot * p;
      a *= 0.5;
    }
    return v;
  }

  // iq-style domain warp: fbm(p + fbm(p + fbm(p)))
  float warped(vec2 p, float t, out vec2 q) {
    q = vec2(fbm(p + vec2(0.0, t * 0.020)),
             fbm(p + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.015),
                  fbm(p + 2.0 * q + vec2(8.3, 2.8)));
    return fbm(p + 2.0 * r);
  }

  // One star layer on a jittered grid. The step() gates ~10% of cells without
  // branching, so every fragment costs the same.
  float starLayer(vec2 uv, float density, float t, float seed) {
    vec2 sc = uv * density;
    vec2 id = floor(sc);
    vec2 gv = fract(sc) - 0.5;

    float n = hash21(id + seed);
    float present = step(0.90, n);

    vec2 off = vec2(hash21(id + seed + 1.7), hash21(id + seed + 3.1)) - 0.5;
    float d = length(gv - off * 0.7);

    float bright = fract(n * 100.0);
    float twinkle = 0.65 + 0.35 * sin(t * (0.6 + bright * 2.2) + n * 62.8);

    float core = smoothstep(0.045, 0.0, d);
    return core * bright * twinkle * present;
  }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 uv = frag / uResolution;
    float aspect = uResolution.x / uResolution.y;

    // Aspect-corrected, centred coordinates for the nebula field.
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    // Pointer nudges the warp; scroll drifts the field downward as you descend.
    vec2 field = p * 2.2
               + uPointer * 0.055
               + vec2(0.0, uScroll * 0.55);

    vec2 q;
    float n = warped(field, uTime, q);

    // Two independent masks so rust and phosphor occupy different regions
    // rather than muddying into one grey cloud.
    float rustMask     = smoothstep(0.42, 0.85, n) * smoothstep(0.15, 0.6, q.x);
    float phosphorMask = smoothstep(0.48, 0.92, n) * smoothstep(0.15, 0.65, q.y);

    vec3 col = VOID;
    col = mix(col, DEEP, smoothstep(0.25, 0.8, n) * 0.85);
    col += RUST * rustMask * 0.085;
    col += PHOSPHOR * phosphorMask * 0.055;

    // Star layers. Each parallaxes further with depth; the nearest moves most.
    vec2 suv = vec2(uv.x * aspect, uv.y);
    float stars = 0.0;
    stars += starLayer(suv + uPointer * 0.004 + vec2(0.0, uScroll * 0.030), 14.0, uTime, 0.0)  * 0.55;
    stars += starLayer(suv + uPointer * 0.010 + vec2(0.0, uScroll * 0.075), 26.0, uTime, 7.3)  * 0.80;
    stars += starLayer(suv + uPointer * 0.022 + vec2(0.0, uScroll * 0.150), 42.0, uTime, 21.9) * 1.00;

    // Warm the brightest stars very slightly toward the ink tone; pure white
    // points on a blue field read as dead pixels.
    col += mix(vec3(0.78, 0.82, 0.95), vec3(1.0, 0.96, 0.90), stars) * stars * 0.85;

    // Vignette — pulls the eye to the centre column where the type sits.
    float vig = 1.0 - 0.38 * dot(p, p);
    col *= vig;

    // Ordered-ish dither. Dark low-frequency gradients band hard at 8-bit and
    // the nebula is almost entirely dark low-frequency gradient. Not optional.
    col += (hash21(frag) - 0.5) / 255.0;

    gl_FragColor = vec4(col, 1.0);
  }
`;

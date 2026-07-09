import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { fragmentShader, vertexShader } from './nebula.glsl';

const canvas = document.querySelector<HTMLCanvasElement>('#bg');
if (canvas) init(canvas);

function init(canvas: HTMLCanvasElement) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  } catch {
    // No WebGL. The CSS --color-void background stands in; nothing else to do.
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');

  // Unclamped devicePixelRatio means a 3x phone shades 9x the fragments.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.autoClear = false;

  // --- Background pass: one fullscreen triangle, drawn without depth. -------
  const bgScene = new Scene();
  const bgCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const triangle = new BufferGeometry();
  triangle.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2(0, 0) },
    uScroll: { value: 0 },
  };

  const nebula = new Mesh(
    triangle,
    new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    }),
  );
  nebula.frustumCulled = false;
  bgScene.add(nebula);

  // --- Moon pass -----------------------------------------------------------
  const moonScene = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.z = 30;

  const textures = new TextureLoader();
  const map = textures.load('/3d/moon/moon.jpg');
  map.colorSpace = SRGBColorSpace;
  const normalMap = textures.load('/3d/moon/normal.jpg'); // stays linear

  const MOON_R = 7; // geometry radius, in world units
  const MOON_Z = -6;

  const moonMaterial = new MeshStandardMaterial({
    map,
    normalMap,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
  });
  // At crescent the light grazes the surface, and a full-strength normal map
  // turns the terminator into speckled static instead of a limb. Dial it back.
  moonMaterial.normalScale.set(0.4, 0.4);

  const moon = new Mesh(new SphereGeometry(MOON_R, 64, 64), moonMaterial);
  moon.position.z = MOON_Z;
  moonScene.add(moon);

  // The phase only reads if the dark limb is genuinely dark. The old scene had
  // a full-white AmbientLight, which is why the moon looked flat. This faint
  // blue fill is earthshine — enough to keep the unlit limb from being a hole.
  const sun = new DirectionalLight(0xfff4e6, 2.6);
  const sunTarget = new Object3D(); // three needs the target in the scene graph
  sun.target = sunTarget;
  moonScene.add(sun, sunTarget, new AmbientLight(0x2a3350, 0.15));

  // --- State ---------------------------------------------------------------
  const pointerTarget = new Vector2(0, 0);
  const pointer = new Vector2(0, 0);
  let scrollTarget = 0;
  let scroll = 0;
  let frozenTime = 0;
  let rafId = 0;
  let running = false;
  let lastFrame = 0; // rAF timestamp, ms

  /**
   * The moon lives in the right-hand gutter — the space between the text column
   * and the viewport edge. It is drawn into a *fixed* canvas, so it occupies one
   * screen position for the whole scroll; anything it overlaps, it overlaps
   * forever. A full moon behind body copy is unreadable, so the moon is sized to
   * the gutter and hidden outright when there isn't one.
   *
   * Container mirrors the pages: `max-w-5xl` (1024px) centred, px-5 / sm:px-8.
   */
  const CONTENT_MAX = 1024;
  const MIN_RADIUS_PX = 62; // below this the moon reads as a smudge, so drop it

  function layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Pixels per world unit at the moon's depth.
    const dist = camera.position.z - MOON_Z;
    const pxPerWorld = h / 2 / (Math.tan((camera.fov / 2) * (Math.PI / 180)) * dist);

    const pad = w < 640 ? 20 : 32;
    const marginRight = (w - Math.min(CONTENT_MAX, w)) / 2 + pad;

    // Allow ~20% of the disc to bleed past the right edge. The 1.9 divisor (not
    // 1.8) leaves slack for the fact that an off-axis sphere projects to an
    // ellipse slightly larger than its on-axis radius.
    const radiusPx = Math.min((marginRight - 24) / 1.9, 165);

    if (radiusPx < MIN_RADIUS_PX) {
      moon.visible = false;
      return;
    }
    moon.visible = true;

    const cx = w - radiusPx * 0.8 - 8;
    const cy = Math.min(Math.max(h * 0.3, 170), 340);

    moon.position.set((cx - w / 2) / pxPerWorld, (h / 2 - cy) / pxPerWorld, MOON_Z);
    moon.scale.setScalar(radiusPx / (MOON_R * pxPerWorld));
  }

  function readScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollTarget = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
  }

  /**
   * The signature. Illuminated fraction is (1 + cos theta) / 2, where theta is
   * the angle between the moon→sun and moon→camera vectors.
   *
   *   theta = 2.2rad  ->  fraction 0.21  (crescent, at the hero)
   *   theta = 0       ->  fraction 1.00  (full, at the contact section)
   *
   * The moon waxes as you descend. It is a progress indicator that had to be a
   * moon.
   *
   * The light is built in the moon→camera frame rather than in world space.
   * The moon sits far off-axis in the right gutter, so moon→camera is nowhere
   * near +Z; setting the sun by a world-space angle would leave the hero at
   * ~54% lit and "full" at ~82%. Constructing the direction from the basis
   * below makes the angle *be* theta, whatever the moon's screen position.
   *
   * -right tilts the lit limb toward the page, not toward the viewport edge
   * that crops it.
   */
  const toCamera = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const sunDir = new Vector3();
  const WORLD_UP = new Vector3(0, 1, 0);
  const TILT = 0.35; // radians the light sits above the moon's equator

  function applyPhase(progress: number) {
    const theta = 2.2 * (1 - progress);

    toCamera.copy(camera.position).sub(moon.position).normalize();
    right.crossVectors(WORLD_UP, toCamera).normalize();
    up.crossVectors(toCamera, right);

    sunDir
      .copy(toCamera)
      .multiplyScalar(Math.cos(theta))
      .addScaledVector(right, -Math.sin(theta) * Math.cos(TILT))
      .addScaledVector(up, Math.sin(theta) * Math.sin(TILT));

    sunTarget.position.copy(moon.position);
    sun.position.copy(moon.position).addScaledVector(sunDir, 60);
  }

  function render() {
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.render(moonScene, camera);
  }

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05); // clamp after a stall
    lastFrame = now;

    pointer.lerp(pointerTarget, 1 - Math.pow(0.001, dt)); // frame-rate independent
    scroll += (scrollTarget - scroll) * (1 - Math.pow(0.0001, dt));

    uniforms.uTime.value += dt;
    uniforms.uPointer.value.copy(pointer);
    uniforms.uScroll.value = scroll;

    moon.rotation.y += 0.05 * dt;
    applyPhase(scroll);

    render();
  }

  /**
   * Reduced motion: no ambient animation at all — the nebula's time uniform
   * stays frozen and there is no rAF loop. Scroll still repaints, because that
   * is the reader's own movement rather than motion imposed on them, and the
   * moon phase is a progress indicator, not decoration.
   */
  let queued = false;
  function renderStatic() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      readScroll();
      scroll = scrollTarget;
      uniforms.uTime.value = frozenTime;
      uniforms.uScroll.value = scroll;
      uniforms.uPointer.value.set(0, 0);
      applyPhase(scroll);
      render();
    });
  }

  function start() {
    if (running || reduceMotion.matches) return;
    running = true;
    lastFrame = performance.now(); // don't integrate the gap spent paused
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // --- Wiring --------------------------------------------------------------
  window.addEventListener('resize', () => {
    layout();
    if (reduceMotion.matches) renderStatic();
  });

  window.addEventListener(
    'scroll',
    () => {
      readScroll();
      if (reduceMotion.matches) renderStatic();
    },
    { passive: true },
  );

  if (finePointer.matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        pointerTarget.set(
          (e.clientX / window.innerWidth) * 2 - 1,
          -((e.clientY / window.innerHeight) * 2 - 1),
        );
      },
      { passive: true },
    );
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  reduceMotion.addEventListener('change', (e) => {
    if (e.matches) {
      frozenTime = uniforms.uTime.value;
      stop();
      renderStatic();
    } else {
      start();
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    layout();
    start();
  });

  layout();
  readScroll();
  scroll = scrollTarget;

  if (reduceMotion.matches) renderStatic();
  else start();
}

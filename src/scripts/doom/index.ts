import { captureViewport } from './capture';
import { createWorld, runGame, type World } from './game';
import { playTransition } from './transition';
import { Hud } from './hud';
import { Sfx } from './audio';

/* Orchestrates the whole easter egg: capture → fall → game → restore.
   startDoom() resolves once the page is fully restored, so the trapdoor can
   be armed again. Everything here must leave the document exactly as found. */

let running = false;

export async function startDoom(): Promise<void> {
  if (running) return;
  running = true;

  const de = document.documentElement;
  const body = document.body;
  const savedScrollY = window.scrollY;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lock scroll first: the scrollbar (if any) disappears before we measure,
  // so the capture and the plane agree on the viewport width.
  de.style.overflow = 'hidden';
  const vw = de.clientWidth;
  const vh = window.innerHeight;
  const scale = Math.min(window.devicePixelRatio || 1, 2);

  let capture: HTMLCanvasElement;
  try {
    capture = await captureViewport(vw, vh, savedScrollY, scale);
  } catch (err) {
    console.error('[doom] viewport capture failed', err);
    de.style.overflow = '';
    running = false;
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:50;display:none;cursor:crosshair;';
  de.appendChild(canvas);

  let world: World;
  try {
    world = createWorld(canvas, capture, vw, vh);
  } catch (err) {
    console.error('[doom] WebGL init failed', err);
    canvas.remove();
    de.style.overflow = '';
    running = false;
    return;
  }

  const controller = new AbortController();
  const sfx = new Sfx();
  const hud = new Hud(de);

  const { bodyAnim } = await playTransition(world, savedScrollY, reduced);
  hud.show();

  await runGame(world, hud, sfx, controller.signal);

  // Restore the page exactly as it was.
  controller.abort();
  bodyAnim?.cancel();
  body.style.visibility = '';
  body.style.transformOrigin = '';
  de.style.perspective = '';
  de.style.perspectiveOrigin = '';
  hud.destroy();
  sfx.close();
  world.dispose();
  canvas.remove();
  de.style.overflow = '';
  const prevBehavior = de.style.scrollBehavior;
  de.style.scrollBehavior = 'auto'; // the site sets scroll-behavior: smooth
  window.scrollTo(0, savedScrollY);
  de.style.scrollBehavior = prevBehavior;
  running = false;
}

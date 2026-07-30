import type { World } from './game';

/* The entry is one motion: the real DOM rotates a full 90° around the bottom
   edge of the viewport, under a CSS perspective equal to the WebGL camera
   distance. When it lies flat, the WebGL scene takes over with its page plane
   at the same angle under the same projection — and the camera simply STAYS
   where the CSS camera was (eye vh/2 above the floor, z = cssPerspective).
   That position IS the player. No descent, no settling: the first game frame
   is pixel-identical to the last DOM frame (dense fog hides the arena at the
   swap; it clears over the next couple of seconds as the room "emerges").
   CSS rotateX(+a) with a bottom origin equals pivot.rotation.x = -a here. */

const FALL_MS = 1100;

export interface TransitionHandles {
  bodyAnim: Animation | null;
}

export async function playTransition(
  world: World,
  savedScrollY: number,
  reduced: boolean
): Promise<TransitionHandles> {
  const de = document.documentElement;
  const body = document.body;
  let bodyAnim: Animation | null = null;

  if (!reduced) {
    de.style.perspective = `${world.cssPerspective}px`;
    de.style.perspectiveOrigin = `50% ${savedScrollY + world.vh / 2}px`;
    body.style.transformOrigin = `50% ${savedScrollY + world.vh}px`;
    bodyAnim = body.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }], {
      // accelerating, like something tipping over
      duration: FALL_MS,
      easing: 'cubic-bezier(0.55, 0, 1, 0.45)',
      fill: 'forwards',
    });
    try {
      await bodyAnim.finished;
    } catch {
      // cancelled (page restore raced the fall) — bail out quietly
      return { bodyAnim };
    }
  }

  world.pivot.rotation.x = -Math.PI / 2;

  // Swap: render the matched frame before revealing the canvas. The camera is
  // already at its final (and only) position.
  world.renderer.render(world.scene, world.camera);
  body.style.visibility = 'hidden';
  world.canvas.style.display = 'block';

  return { bodyAnim };
}

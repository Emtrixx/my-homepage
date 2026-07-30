/* Loaded only on the blog post with `doom: true` in its frontmatter. The game
   itself sits behind a dynamic import, so reading the post costs nothing —
   the doom chunks are fetched the moment someone finds the loose board. */

const trapdoor = document.getElementById('trapdoor');

// Pointer Lock needs a mouse; on touch devices the glyph stays decoration.
if (trapdoor && window.matchMedia('(pointer: fine)').matches) {
  trapdoor.addEventListener('click', () => {
    void (async () => {
      const { startDoom } = await import('./doom/index');
      await startDoom();
    })();
  });
}

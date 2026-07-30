/* Arena scale is dictated by the entry transition: the camera never moves
   during the fall, so the player's eye ends exactly vh/2 above the floor at
   z = cssPerspective. Cells, walls and monsters are sized in proportion to
   that eye height — which turns the fallen page into a small rug in a large
   hall. 1 world unit = 1 CSS px throughout. */

export interface MapData {
  cols: number;
  rows: number;
  cell: number;
  originX: number;
  originZ: number;
  wallHeight: number;
  solid: Uint8Array;
  enemySpawns: { x: number; z: number }[];
  playerSpawn: { x: number; z: number };
  /** Where the exit door rises after the last kill (faces +z, toward spawn). */
  door: { x: number; z: number };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildMap(vw: number, vh: number, cssPerspective: number): MapData {
  const S = vh; // scene scale: one cell per viewport height
  const cell = S;
  const pageCellsX = Math.ceil(vw / cell);
  const pageCellsZ = Math.ceil(vh / cell);
  const margin = 5;
  // South margin must contain the player spawn at z = cssPerspective.
  const marginS = Math.max(3, Math.ceil((cssPerspective + cell) / cell));

  const cols = pageCellsX + 2 * margin;
  const rows = pageCellsZ + margin + marginS;
  const originX = -vw / 2 - margin * cell;
  const originZ = -vh - margin * cell;
  // Eye sits at 0.5·S above the floor; the ceiling must clear it comfortably.
  const wallHeight = 1.05 * S;

  const playerSpawn = { x: 0, z: cssPerspective };
  const door = { x: 0, z: -vh - 0.35 * S };

  const solid = new Uint8Array(cols * rows);
  const at = (i: number, j: number) => j * cols + i;
  const inBounds = (i: number, j: number) => i >= 0 && i < cols && j >= 0 && j < rows;

  // Page rug in cell coords (open by construction).
  const pageI0 = margin;
  const pageI1 = margin + pageCellsX; // exclusive
  const pageJ0 = margin;
  const pageJ1 = margin + pageCellsZ;

  const spawnI = Math.floor((playerSpawn.x - originX) / cell);
  const spawnJ = Math.floor((playerSpawn.z - originZ) / cell);

  // Border walls.
  for (let i = 0; i < cols; i++) {
    solid[at(i, 0)] = 1;
    solid[at(i, rows - 1)] = 1;
  }
  for (let j = 0; j < rows; j++) {
    solid[at(0, j)] = 1;
    solid[at(cols - 1, j)] = 1;
  }

  // The clearance pad around the rug also covers the door row (one cell past
  // the rug's far edge) and the spawn row — the whole hall stays open.
  const nearPage = (i: number, j: number, pad: number) =>
    i >= pageI0 - pad && i < pageI1 + pad && j >= pageJ0 - pad && j < pageJ1 + pad;
  const nearSpawn = (i: number, j: number) => Math.abs(i - spawnI) <= 1 && Math.abs(j - spawnJ) <= 1;

  const placePillar = (i: number, j: number) => {
    if (!inBounds(i, j)) return;
    if (nearPage(i, j, 1) || nearSpawn(i, j)) return;
    solid[at(i, j)] = 1;
  };

  // Pillars at the hall's corners, two cells out from the rug.
  placePillar(pageI0 - 2, pageJ0 - 2);
  placePillar(pageI1 + 1, pageJ0 - 2);
  placePillar(pageI0 - 2, pageJ1 + 1);
  placePillar(pageI1 + 1, pageJ1 + 1);

  // Scattered rubble in the outer band.
  const rand = mulberry32(2026);
  const want = Math.floor((cols * rows) / 14);
  for (let n = 0; n < want; n++) {
    const i = 1 + Math.floor(rand() * (cols - 2));
    const j = 1 + Math.floor(rand() * (rows - 2));
    placePillar(i, j);
  }

  // Enemy spawns: ringed around the hall, all just outside sight range so the
  // room starts quiet — footsteps or gunfire wake them.
  const cellCenter = (i: number, j: number) => ({
    x: originX + (i + 0.5) * cell,
    z: originZ + (j + 0.5) * cell,
  });
  const jMid = Math.floor((pageJ0 + pageJ1) / 2);
  const candidates = [
    cellCenter(pageI0, pageJ0 - 3),
    cellCenter(pageI1 - 1, pageJ0 - 3),
    cellCenter(pageI0 - 3, jMid),
    cellCenter(pageI1 + 2, jMid),
    cellCenter(pageI0 - 4, pageJ1 + 1),
    cellCenter(pageI1 + 3, pageJ1 + 1),
  ];
  const enemySpawns = candidates.filter((p) => {
    const i = Math.floor((p.x - originX) / cell);
    const j = Math.floor((p.z - originZ) / cell);
    if (!inBounds(i, j) || solid[at(i, j)]) return false;
    return Math.hypot(p.x - playerSpawn.x, p.z - playerSpawn.z) > 2.35 * S;
  });

  return {
    cols,
    rows,
    cell,
    originX,
    originZ,
    wallHeight,
    solid,
    enemySpawns,
    playerSpawn,
    door,
  };
}

export function isSolid(map: MapData, x: number, z: number): boolean {
  const i = Math.floor((x - map.originX) / map.cell);
  const j = Math.floor((z - map.originZ) / map.cell);
  if (i < 0 || i >= map.cols || j < 0 || j >= map.rows) return true;
  return map.solid[j * map.cols + i] === 1;
}

/** Push a circle out of any solid cells it overlaps. Returns the resolved position. */
export function collideCircle(
  map: MapData,
  x: number,
  z: number,
  r: number
): { x: number; z: number } {
  const cell = map.cell;
  const i0 = Math.floor((x - r - map.originX) / cell);
  const i1 = Math.floor((x + r - map.originX) / cell);
  const j0 = Math.floor((z - r - map.originZ) / cell);
  const j1 = Math.floor((z + r - map.originZ) / cell);

  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const outside = i < 0 || i >= map.cols || j < 0 || j >= map.rows;
      if (!outside && map.solid[j * map.cols + i] !== 1) continue;
      const minX = map.originX + i * cell;
      const minZ = map.originZ + j * cell;
      const cx = Math.max(minX, Math.min(x, minX + cell));
      const cz = Math.max(minZ, Math.min(z, minZ + cell));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r || d2 === 0) continue;
      const d = Math.sqrt(d2);
      x += (dx / d) * (r - d);
      z += (dz / d) * (r - d);
    }
  }
  return { x, z };
}

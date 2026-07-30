import * as THREE from 'three';

/* All game art is generated here at runtime: zero binary assets, and the
   palette stays locked to the site's design tokens. */
export const PAL = {
  void: '#0a0e1a',
  deep: '#151b2e',
  edge: '#2b3350',
  ink: '#f2efe7',
  dust: '#c2bcae',
  rust: '#c4553a',
  rustLift: '#dd6a4d',
  phosphor: '#7fb0a3',
} as const;

/** Deterministic PRNG so textures look identical every run. */
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

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return [c, ctx];
}

function surfaceTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** 64x64 tiling wall: dark metal panels with rivets and rust staining. */
export function makeWallTexture(): THREE.CanvasTexture {
  const rand = mulberry32(1337);
  const [c, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = PAL.deep;
  ctx.fillRect(0, 0, 64, 64);

  // subtle per-pixel noise
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const n = rand();
      if (n < 0.16) {
        ctx.fillStyle = n < 0.05 ? PAL.void : 'rgba(10, 14, 26, 0.45)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // horizontal panel seams every 16px
  for (let y = 0; y < 64; y += 16) {
    ctx.fillStyle = PAL.void;
    ctx.fillRect(0, y, 64, 2);
    ctx.fillStyle = PAL.edge;
    ctx.fillRect(0, y + 2, 64, 1);
    // rivets along each seam, offset per band
    ctx.fillStyle = PAL.edge;
    const off = (y / 16) % 2 === 0 ? 6 : 14;
    for (let x = off; x < 64; x += 16) ctx.fillRect(x, y + 5, 2, 2);
  }

  // one vertical seam per band, staggered
  ctx.fillStyle = PAL.void;
  ctx.fillRect(40, 2, 2, 14);
  ctx.fillRect(12, 18, 2, 14);
  ctx.fillRect(52, 34, 2, 14);
  ctx.fillRect(24, 50, 2, 14);

  // rust stains bleeding down from rivets
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(rand() * 60) + 2;
    const y = Math.floor(rand() * 56) + 2;
    const len = 3 + Math.floor(rand() * 8);
    ctx.fillStyle = i % 3 === 0 ? PAL.rustLift : PAL.rust;
    ctx.globalAlpha = 0.35 + rand() * 0.3;
    for (let d = 0; d < len; d++) ctx.fillRect(x, y + d, 1, 1);
    ctx.globalAlpha = 1;
  }
  return surfaceTexture(c);
}

/** 64x64 tiling floor: dark slabs with grout lines, for outside the page. */
export function makeFloorTexture(): THREE.CanvasTexture {
  const rand = mulberry32(4242);
  const [c, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = PAL.void;
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const n = rand();
      if (n < 0.2) {
        ctx.fillStyle = n < 0.06 ? PAL.edge : PAL.deep;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
  }
  // slab grout
  ctx.fillStyle = PAL.deep;
  ctx.fillRect(0, 0, 64, 1);
  ctx.fillRect(0, 32, 64, 1);
  ctx.fillRect(0, 0, 1, 64);
  ctx.fillRect(32, 32, 1, 32);
  ctx.fillRect(16, 0, 1, 32);
  // sparse rust specks — kept faint: at grazing angles the mip average of this
  // tile becomes the floor's far-field color, and a warm tint reads as a halo
  // around the page rug
  ctx.fillStyle = PAL.rust;
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.floor(rand() * 64), Math.floor(rand() * 64), 1, 1);
  ctx.globalAlpha = 1;
  return surfaceTexture(c);
}

/* ------------------------------------------------------------------------- */
/* Enemy sprites: string-stencil pixel art. One char = one palette slot.     */
/* ------------------------------------------------------------------------- */

const STENCIL_COLORS: Record<string, string> = {
  k: '#06080f', // outline
  d: PAL.deep,
  e: PAL.edge,
  r: PAL.rust,
  R: PAL.rustLift,
  p: PAL.phosphor,
  P: '#b8ded2', // eye, flared
  q: '#4c7268', // eye, dim
  i: PAL.ink,
};

function stencilToTexture(rows: string[]): THREE.CanvasTexture {
  const h = rows.length;
  const w = rows[0].length;
  const [c, ctx] = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = STENCIL_COLORS[rows[y][x]];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// The sentinel: a horned rust effigy with one phosphor eye. 16x22.
const SENTINEL_IDLE_A = [
  '..k..........k..',
  '.kRk........kRk.',
  '.kRk........kRk.',
  '..krkkkkkkkkrk..',
  '..krrrrrrrrrrk..',
  '.krrrrrrrrrrrrk.',
  '.krrkkppppkkrrk.',
  '.krrrkkkkkkrrrk.',
  '..krrrrrrrrrrk..',
  '...krrkkkkrrk...',
  '..kRrrrrrrrrRk..',
  '.kRRrrrrrrrrRRk.',
  '.kRkrrrrrrrrkRk.',
  '.krk.krrrrk.krk.',
  '.krk.krrrrk.krk.',
  '..k..krrrrk..k..',
  '.....krrrrk.....',
  '.....kdrrdk.....',
  '......kddk......',
  '......kddk......',
  '.......kk.......',
  '................',
];

const SENTINEL_IDLE_B = [
  '..k..........k..',
  '.kRk........kRk.',
  '.kRk........kRk.',
  '..krkkkkkkkkrk..',
  '..krrrrrrrrrrk..',
  '.krrrrrrrrrrrrk.',
  '.krrkkqqqqkkrrk.',
  '.krrrkkkkkkrrrk.',
  '..krrrrrrrrrrk..',
  '...krrkkkkrrk...',
  '..kRrrrrrrrrRk..',
  '.kRRrrrrrrrrRRk.',
  '.kRkrrrrrrrrkRk.',
  '.krk.krrrrk.krk.',
  '.krk.krrrrk.krk.',
  '..k..krrrrk..k..',
  '.....krrrrk.....',
  '.....kdrrdk.....',
  '.....kddk.......',
  '....kddk........',
  '.....kk.........',
  '................',
];

const SENTINEL_ATTACK = [
  '..k..........k..',
  '.kRk........kRk.',
  '.kRk........kRk.',
  '..krkkkkkkkkrk..',
  '..krrrrrrrrrrk..',
  '.krrrrrrrrrrrrk.',
  '.krkkkPPPPkkkrk.',
  '.krrrkkkkkkrrrk.',
  '..krrrkkkkrrrk..',
  '..krrkkkkkkrrk..',
  'kkRrrrrrrrrrrRkk',
  'kRRrrrrrrrrrrRRk',
  'kRkkrrrrrrrrkkRk',
  'kk..krrrrrrk..kk',
  '....krrrrrrk....',
  '....krrrrrrk....',
  '.....krrrrk.....',
  '.....kdrrdk.....',
  '......kddk......',
  '......kddk......',
  '.......kk.......',
  '................',
];

const SENTINEL_DEATH_1 = [
  '................',
  '................',
  '................',
  '................',
  '..k..........k..',
  '.kRk........kRk.',
  '..krkkkkkkkkrk..',
  '..krrrrrrrrrrk..',
  '.krrkkqqqqkkrrk.',
  '.krrrkkkkkkrrrk.',
  '..krrrrrrrrrrk..',
  '.kRRrrrrrrrrRRk.',
  '.kRkrrrrrrrrkRk.',
  '.krk.krrrrk.krk.',
  '..k..krrrrk..k..',
  '.....krrrrk.....',
  '.....kdrrdk.....',
  '......kddk......',
  '......kddk......',
  '.......kk.......',
  '................',
  '................',
];

const SENTINEL_DEATH_2 = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..k..........k..',
  '.kRk..kkkk..kRk.',
  '..kkkrrrrrrkkk..',
  '..krrrkkkkrrrk..',
  '.krrrrrrrrrrrrk.',
  '.kRrrrrrrrrrrRk.',
  '..krrdrrrrdrrk..',
  '...kkddddddkk...',
  '.....kkkkkk.....',
  '................',
];

const SENTINEL_DEATH_3 = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....r......R....',
  '..k...rr.....k..',
  '...krrrrrrrrk...',
  '..kdrrddrrdrdk..',
  '...kkkkkkkkkk...',
  '................',
];

export interface EnemyFrames {
  idle: THREE.CanvasTexture[];
  attack: THREE.CanvasTexture;
  death: THREE.CanvasTexture[];
  /** stencil aspect: width / height */
  aspect: number;
}

export function makeEnemyFrames(): EnemyFrames {
  return {
    idle: [stencilToTexture(SENTINEL_IDLE_A), stencilToTexture(SENTINEL_IDLE_B)],
    attack: stencilToTexture(SENTINEL_ATTACK),
    death: [
      stencilToTexture(SENTINEL_DEATH_1),
      stencilToTexture(SENTINEL_DEATH_2),
      stencilToTexture(SENTINEL_DEATH_3),
    ],
    aspect: 16 / 22,
  };
}

/* ------------------------------------------------------------------------- */
/* Weapon: drawn each frame onto the HUD's small canvas (upscaled by CSS).   */
/* ------------------------------------------------------------------------- */

export const WEAPON_W = 64;
export const WEAPON_H = 48;

export function drawWeapon(
  ctx: CanvasRenderingContext2D,
  firing: boolean,
  bobX: number,
  bobY: number
): void {
  ctx.clearRect(0, 0, WEAPON_W, WEAPON_H);
  ctx.save();
  ctx.translate(Math.round(bobX), Math.round(bobY) + (firing ? 2 : 0));

  const cx = WEAPON_W / 2;
  // grip / body: a squat blaster seen from behind
  ctx.fillStyle = PAL.deep;
  ctx.fillRect(cx - 10, 26, 20, 22);
  ctx.fillStyle = PAL.edge;
  ctx.fillRect(cx - 10, 26, 20, 2);
  ctx.fillRect(cx - 10, 26, 2, 22);
  ctx.fillStyle = '#06080f';
  ctx.fillRect(cx + 8, 26, 2, 22);

  // barrel shroud
  ctx.fillStyle = PAL.edge;
  ctx.fillRect(cx - 6, 16, 12, 12);
  ctx.fillStyle = PAL.deep;
  ctx.fillRect(cx - 4, 18, 8, 10);
  // vents
  ctx.fillStyle = '#06080f';
  ctx.fillRect(cx - 6, 20, 12, 1);
  ctx.fillRect(cx - 6, 23, 12, 1);

  // muzzle ring + sight
  ctx.fillStyle = PAL.dust;
  ctx.fillRect(cx - 5, 14, 10, 2);
  ctx.fillStyle = PAL.phosphor;
  ctx.fillRect(cx - 1, 12, 2, 2);

  if (firing) {
    // muzzle star
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(cx - 2, 4, 4, 8);
    ctx.fillRect(cx - 5, 7, 10, 2);
    ctx.fillStyle = PAL.rustLift;
    ctx.fillRect(cx - 1, 1, 2, 4);
    ctx.fillRect(cx - 7, 7, 2, 2);
    ctx.fillRect(cx + 5, 7, 2, 2);
  }
  ctx.restore();
}

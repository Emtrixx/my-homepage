import * as THREE from 'three';
import { buildMap, type MapData } from './map';
import { makeWallTexture, makeFloorTexture, makeEnemyFrames, PAL } from './textures';
import { EnemyManager } from './enemies';
import { Player } from './player';
import { Weapon } from './weapon';
import { Input } from './input';
import type { Hud } from './hud';
import type { Sfx } from './audio';

export const FOV = 65;

export interface World {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** The captured page, hinged at the bottom edge of the viewport plane. */
  pivot: THREE.Group;
  walls: THREE.InstancedMesh;
  map: MapData;
  pageTexture: THREE.CanvasTexture;
  fog: THREE.FogExp2;
  /** Fog density at the swap (arena hidden) and once the room has emerged. */
  fogStart: number;
  fogTarget: number;
  vw: number;
  vh: number;
  floorY: number;
  /** Eye height in world y — where the CSS camera sits, forever. */
  eyeY: number;
  /** Camera distance that makes an upright page plane fill the viewport 1:1 —
      also the CSS perspective used for the DOM half of the fall. */
  cssPerspective: number;
  dispose(): void;
}

export function createWorld(
  canvas: HTMLCanvasElement,
  capture: HTMLCanvasElement,
  vw: number,
  vh: number
): World {
  const disposables: { dispose(): void }[] = [];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(vw, vh, false);
  disposables.push(renderer);

  const fovRad = (FOV * Math.PI) / 180;
  const cssPerspective = vh / 2 / Math.tan(fovRad / 2);
  const S = vh; // scene scale, see map.ts

  const camera = new THREE.PerspectiveCamera(FOV, vw / vh, 0.01 * S, 40 * S);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 0, cssPerspective);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.void);
  // Dense at the swap so the arena is invisible (matching the black void
  // behind the falling DOM page); runGame eases it to fogTarget.
  const fogStart = 4 / S;
  const fogTarget = 0.6 / S;
  const fog = new THREE.FogExp2(PAL.void, fogStart);
  scene.fog = fog;

  const floorY = -vh / 2;
  const eyeY = 0;
  const map = buildMap(vw, vh, cssPerspective);

  // The fallen page. Pivot sits on the hinge line (bottom edge of the
  // viewport plane); rotating it to -90° lays the page flat from z=0 to z=-vh.
  // fog:false — the page must match the DOM exactly at both swaps.
  const pageTexture = new THREE.CanvasTexture(capture);
  pageTexture.colorSpace = THREE.SRGBColorSpace;
  pageTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pageGeometry = new THREE.PlaneGeometry(vw, vh);
  const pageMaterial = new THREE.MeshBasicMaterial({ map: pageTexture, fog: false });
  disposables.push(pageTexture, pageGeometry, pageMaterial);
  const page = new THREE.Mesh(pageGeometry, pageMaterial);
  page.position.y = vh / 2;
  const pivot = new THREE.Group();
  pivot.position.set(0, floorY + 2, 0); // +2: floats a hair over the arena floor
  pivot.add(page);
  scene.add(pivot);

  // Arena floor.
  const floorTexture = makeFloorTexture();
  floorTexture.repeat.set(map.cols * 2, map.rows * 2);
  const floorGeometry = new THREE.PlaneGeometry(map.cols * map.cell, map.rows * map.cell);
  const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture });
  disposables.push(floorTexture, floorGeometry, floorMaterial);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(
    map.originX + (map.cols * map.cell) / 2,
    floorY,
    map.originZ + (map.rows * map.cell) / 2
  );
  scene.add(floor);

  // Ceiling.
  const ceilingGeometry = new THREE.PlaneGeometry(map.cols * map.cell, map.rows * map.cell);
  const ceilingMaterial = new THREE.MeshBasicMaterial({ color: PAL.deep });
  disposables.push(ceilingGeometry, ceilingMaterial);
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(floor.position.x, floorY + map.wallHeight, floor.position.z);
  scene.add(ceiling);

  // Walls: one instanced box per solid cell. Texture density is kept relative
  // to the cell so the pixel-art chunkiness matches the old 128px scale.
  const wallTexture = makeWallTexture();
  wallTexture.repeat.set(2, Math.max(2, Math.round(map.wallHeight / (map.cell / 2))));
  const wallGeometry = new THREE.BoxGeometry(map.cell, map.wallHeight, map.cell);
  const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });
  disposables.push(wallTexture, wallGeometry, wallMaterial);
  let solidCount = 0;
  for (let n = 0; n < map.solid.length; n++) if (map.solid[n]) solidCount++;
  const walls = new THREE.InstancedMesh(wallGeometry, wallMaterial, solidCount);
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let j = 0; j < map.rows; j++) {
    for (let i = 0; i < map.cols; i++) {
      if (!map.solid[j * map.cols + i]) continue;
      m.makeTranslation(
        map.originX + (i + 0.5) * map.cell,
        floorY + map.wallHeight / 2,
        map.originZ + (j + 0.5) * map.cell
      );
      walls.setMatrixAt(idx++, m);
    }
  }
  walls.instanceMatrix.needsUpdate = true;
  scene.add(walls);

  return {
    canvas,
    renderer,
    scene,
    camera,
    pivot,
    walls,
    map,
    pageTexture,
    fog,
    fogStart,
    fogTarget,
    vw,
    vh,
    floorY,
    eyeY,
    cssPerspective,
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

/* ------------------------------------------------------------------------- */
/* The exit door: an upright copy of the page, risen from the floor.         */
/* Walking into it glides the camera onto the exact CSS-camera position      */
/* (centered, distance cssPerspective, level) — where the plane fills the    */
/* viewport 1:1 and the swap back to the real DOM is invisible.              */
/* ------------------------------------------------------------------------- */

interface Door {
  group: THREE.Group;
  /** z where the projection matches the DOM (door z + cssPerspective) */
  matchZ: number;
  riseT: number;
  ready: boolean;
  disposables: { dispose(): void }[];
}

function buildDoor(world: World): Door {
  const { map, vw, vh } = world;
  const S = vh;
  const disposables: { dispose(): void }[] = [];

  const group = new THREE.Group();
  group.position.set(map.door.x, world.floorY, map.door.z);
  group.scale.y = 0.001;

  // The page itself, upright, bottom edge on the floor, facing the player.
  const pageGeometry = new THREE.PlaneGeometry(vw, vh);
  const pageMaterial = new THREE.MeshBasicMaterial({ map: world.pageTexture, fog: false });
  disposables.push(pageGeometry, pageMaterial);
  const page = new THREE.Mesh(pageGeometry, pageMaterial);
  page.position.y = vh / 2;
  group.add(page);

  // A dark backing so it reads as solid from behind.
  const backMaterial = new THREE.MeshBasicMaterial({ color: PAL.deep });
  disposables.push(backMaterial);
  const back = new THREE.Mesh(pageGeometry, backMaterial);
  back.position.set(0, vh / 2, -0.01 * S);
  back.rotation.y = Math.PI;
  group.add(back);

  // Phosphor frame: thin bars along both verticals and the top.
  const barW = 0.018 * S;
  const frameMaterial = new THREE.MeshBasicMaterial({ color: PAL.phosphor, fog: false });
  const sideGeometry = new THREE.BoxGeometry(barW, vh + barW, barW);
  const topGeometry = new THREE.BoxGeometry(vw + 2 * barW, barW, barW);
  disposables.push(frameMaterial, sideGeometry, topGeometry);
  const left = new THREE.Mesh(sideGeometry, frameMaterial);
  left.position.set(-vw / 2 - barW / 2, (vh + barW) / 2, 0);
  const right = new THREE.Mesh(sideGeometry, frameMaterial);
  right.position.set(vw / 2 + barW / 2, (vh + barW) / 2, 0);
  const top = new THREE.Mesh(topGeometry, frameMaterial);
  top.position.set(0, vh + barW / 2, 0);
  group.add(left, right, top);

  // Soft glow backdrop behind the frame.
  const glowGeometry = new THREE.PlaneGeometry(vw * 1.08, vh * 1.06);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: PAL.phosphor,
    transparent: true,
    opacity: 0.12,
    fog: false,
    depthWrite: false,
  });
  disposables.push(glowGeometry, glowMaterial);
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.set(0, vh / 2, -0.005 * S);
  group.add(glow);

  world.scene.add(group);
  return {
    group,
    matchZ: map.door.z + world.cssPerspective,
    riseT: 0,
    ready: false,
    disposables,
  };
}

type GameState = 'prompt' | 'playing' | 'paused' | 'dead' | 'exiting';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
/** smallest signed angle equivalent (target 0) */
function angleToZero(a: number): number {
  return -Math.atan2(Math.sin(a), Math.cos(a));
}

export function runGame(world: World, hud: Hud, sfx: Sfx, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const { scene, camera, renderer, map, canvas } = world;
    const S = world.vh;

    const frames = makeEnemyFrames();
    const enemies = new EnemyManager(scene, frames, world.floorY, map.enemySpawns, S);
    const player = new Player(map.playerSpawn.x, map.playerSpawn.z, S);
    const weapon = new Weapon();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let state: GameState = 'prompt';
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let doorTimer = -1;
    let door: Door | null = null;
    let glide: { t: number; dur: number; x: number; z: number; yaw: number; pitch: number } | null =
      null;

    const finish = () => {
      cancelAnimationFrame(raf);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      enemies.dispose(scene);
      for (const t of [...frames.idle, frames.attack, ...frames.death]) t.dispose();
      if (door) {
        scene.remove(door.group);
        for (const d of door.disposables) d.dispose();
      }
      resolve();
    };

    const input = new Input(canvas, signal, {
      onLockChange(locked) {
        if (state === 'exiting') return; // mid-glide, the lock is irrelevant
        if (locked) {
          state = 'playing';
          hud.showPrompt(false);
          hud.hideOverlay();
        } else if (state === 'playing') {
          state = 'paused';
          hud.showPause(
            () => input.requestLock(),
            () => finish()
          );
        }
      },
      onFire() {
        if (state !== 'playing') return;
        const result = weapon.fire(camera, enemies, world.walls);
        if (result === 'empty') {
          sfx.dryFire();
          return;
        }
        if (result === 'cooling') return;
        sfx.shoot();
        hud.muzzleFlash();
        hud.setAmmo(weapon.ammo);
        enemies.alert(player);
        if (result === 'killed') {
          sfx.enemyDeath();
          hud.setKills(enemies.kills, enemies.total);
        } else if (result === 'hit') {
          sfx.hit();
        }
      },
      onMute() {
        sfx.toggleMute();
      },
    });

    canvas.addEventListener(
      'click',
      () => {
        if (state === 'prompt') {
          sfx.resume();
          input.requestLock();
        }
      },
      { signal }
    );

    const events = {
      onPlayerHit(damage: number) {
        if (state !== 'playing') return;
        player.health -= damage;
        hud.setHealth(player.health);
        hud.damageFlash();
        sfx.playerHurt();
        if (player.health <= 0) {
          state = 'dead';
          if (document.pointerLockElement === canvas) document.exitPointerLock();
          hud.showDeath(() => finish());
        }
      },
      onAggro() {
        sfx.growl();
      },
    };

    const tryEnterDoor = () => {
      if (!door || !door.ready || state !== 'playing') return;
      const dz = player.z - door.matchZ;
      // in front of the door, just short of the match plane, roughly facing it
      if (dz < 0 || dz > 0.4 * S) return;
      if (Math.abs(player.x - map.door.x) > 0.55 * world.vw) return;
      const toDoor = Math.atan2(-(map.door.x - player.x), -(map.door.z - player.z));
      const facing = Math.cos(player.yaw - toDoor);
      if (facing < 0.25) return;

      state = 'exiting';
      hud.showPrompt(false);
      glide = {
        t: 0,
        dur: reduced ? 0.001 : 0.75,
        x: player.x,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch,
      };
    };

    hud.setHealth(player.health);
    hud.setAmmo(weapon.ammo);
    hud.setKills(0, enemies.total);
    hud.showPrompt(true);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      // The room emerges out of the dark after the swap.
      world.fog.density =
        world.fogTarget + (world.fogStart - world.fogTarget) * Math.exp(-2.2 * elapsed);

      if (door && door.riseT < 1) {
        door.riseT = Math.min(1, door.riseT + dt / (reduced ? 0.001 : 1.0));
        door.group.scale.y = Math.max(0.001, easeOutCubic(door.riseT));
        if (door.riseT >= 1) door.ready = true;
      }

      if (state === 'playing') {
        player.update(dt, input, map);
        enemies.update(dt, player, map, events);
        weapon.update(dt);

        if (enemies.aliveCount === 0 && doorTimer < 0 && !door) doorTimer = 1.1;
        if (doorTimer > 0) {
          doorTimer -= dt;
          if (doorTimer <= 0) {
            door = buildDoor(world);
            sfx.doorOpen();
            hud.flashMessage('the way out stands open', 3000);
          }
        }

        tryEnterDoor();

        const bobPhase = now / 1000;
        hud.drawWeapon(
          weapon.firing,
          Math.sin(bobPhase * 7.2) * 3 * player.moveAmount,
          Math.abs(Math.cos(bobPhase * 7.2)) * 2.5 * player.moveAmount
        );
        camera.position.set(player.x, world.eyeY, player.z);
        camera.rotation.set(player.pitch, player.yaw, 0);
      } else if (state === 'exiting' && glide && door) {
        glide.t = Math.min(1, glide.t + dt / glide.dur);
        const e = easeInOutCubic(glide.t);
        camera.position.set(
          glide.x + (map.door.x - glide.x) * e,
          world.eyeY,
          glide.z + (door.matchZ - glide.z) * e
        );
        camera.rotation.set(
          glide.pitch * (1 - e),
          glide.yaw + angleToZero(glide.yaw) * e,
          0
        );
        if (glide.t >= 1) {
          // matched frame: the upright page fills the viewport exactly
          renderer.render(scene, camera);
          finish();
          return;
        }
      } else {
        camera.position.set(player.x, world.eyeY, player.z);
        camera.rotation.set(player.pitch, player.yaw, 0);
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
  });
}

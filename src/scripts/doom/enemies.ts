import * as THREE from 'three';
import { collideCircle, type MapData } from './map';
import type { EnemyFrames } from './textures';

/* All distances and sizes are multiples of the scene scale (viewport height),
   so the sentinels keep the same apparent proportions at any window size. */
const WINDUP = 0.38; // s
const ATTACK_COOLDOWN = 1.0;
const WALK_FRAME_TIME = 0.28;
const DEATH_FRAME_TIME = 0.16;
const DAMAGE = 12;
const HP = 24;

type State = 'idle' | 'chase' | 'windup' | 'cooldown' | 'dying' | 'dead';

class Enemy {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  x: number;
  z: number;
  hp = HP;
  state: State = 'idle';
  readonly radius: number;
  private readonly height: number;
  private readonly sight: number;
  private readonly attackRange: number;
  private readonly attackReach: number;
  private timer = 0;
  private animTimer = 0;
  private frame = 0;
  private speed: number;
  private stuckTime = 0;
  private detourTime = 0;
  private detourDir: 1 | -1;

  constructor(
    private frames: EnemyFrames,
    private floorY: number,
    spawn: { x: number; z: number },
    seed: number,
    private scale: number
  ) {
    this.x = spawn.x;
    this.z = spawn.z;
    this.height = 0.66 * scale;
    this.radius = 0.11 * scale;
    this.sight = 2.2 * scale;
    this.attackRange = 0.55 * scale;
    this.attackReach = 0.8 * scale;
    this.speed = (0.34 + (seed % 3) * 0.06) * scale;
    this.detourDir = seed % 2 === 0 ? 1 : -1;
    this.material = new THREE.SpriteMaterial({ map: frames.idle[0], fog: true });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(this.height * frames.aspect, this.height, 1);
    this.sprite.position.set(this.x, floorY + this.height / 2, this.z);
  }

  get alive(): boolean {
    return this.state !== 'dying' && this.state !== 'dead';
  }

  update(
    dt: number,
    player: { x: number; z: number },
    map: MapData,
    events: { onPlayerHit: (damage: number) => void; onAggro: () => void }
  ): void {
    this.timer -= dt;
    this.animTimer += dt;

    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);

    switch (this.state) {
      case 'idle':
        if (this.animTimer > WALK_FRAME_TIME * 2.5) {
          this.animTimer = 0;
          this.frame ^= 1;
          this.material.map = this.frames.idle[this.frame];
        }
        if (dist < this.sight) {
          this.state = 'chase';
          events.onAggro();
        }
        break;

      case 'chase': {
        if (dist < this.attackRange) {
          this.state = 'windup';
          this.timer = WINDUP;
          this.material.map = this.frames.attack;
          break;
        }
        // Straight pursuit; when a wall stalls it, sidestep perpendicular for
        // a moment (alternating sides) so pillars don't pin it forever.
        const step = this.speed * dt;
        let dirX = dx / (dist || 1);
        let dirZ = dz / (dist || 1);
        if (this.detourTime > 0) {
          this.detourTime -= dt;
          const px = -dirZ * this.detourDir;
          const pz = dirX * this.detourDir;
          dirX = px;
          dirZ = pz;
        }
        const next = collideCircle(map, this.x + dirX * step, this.z + dirZ * step, this.radius);
        const moved = Math.hypot(next.x - this.x, next.z - this.z);
        this.x = next.x;
        this.z = next.z;
        if (this.detourTime <= 0) {
          this.stuckTime = moved < step * 0.4 ? this.stuckTime + dt : 0;
          if (this.stuckTime > 0.35) {
            this.stuckTime = 0;
            this.detourTime = 0.7;
            this.detourDir = this.detourDir === 1 ? -1 : 1;
          }
        }
        if (this.animTimer > WALK_FRAME_TIME) {
          this.animTimer = 0;
          this.frame ^= 1;
          this.material.map = this.frames.idle[this.frame];
        }
        break;
      }

      case 'windup':
        if (this.timer <= 0) {
          if (dist < this.attackReach) events.onPlayerHit(DAMAGE);
          this.state = 'cooldown';
          this.timer = ATTACK_COOLDOWN;
          this.material.map = this.frames.idle[0];
        }
        break;

      case 'cooldown':
        if (this.timer <= 0) this.state = 'chase';
        break;

      case 'dying':
        if (this.timer <= 0) {
          this.frame += 1;
          if (this.frame >= this.frames.death.length) {
            this.state = 'dead';
            this.sprite.visible = false;
          } else {
            this.material.map = this.frames.death[this.frame];
            this.timer = DEATH_FRAME_TIME;
          }
        }
        break;

      case 'dead':
        return;
    }

    // gentle hover bob while active
    const bob = this.alive ? Math.sin(performance.now() / 320 + this.speed) * 0.02 * this.scale : 0;
    this.sprite.position.set(this.x, this.floorY + this.height / 2 + bob, this.z);
  }

  /** @returns true when this hit killed the enemy */
  damage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    if (this.state === 'idle') this.state = 'chase';
    if (this.hp <= 0) {
      this.state = 'dying';
      this.frame = 0;
      this.timer = DEATH_FRAME_TIME;
      this.material.map = this.frames.death[0];
      return true;
    }
    return false;
  }

  dispose(): void {
    this.material.dispose();
  }
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  readonly total: number;
  kills = 0;

  constructor(
    scene: THREE.Scene,
    frames: EnemyFrames,
    floorY: number,
    spawns: { x: number; z: number }[],
    private scale: number
  ) {
    spawns.forEach((spawn, i) => {
      const enemy = new Enemy(frames, floorY, spawn, i, scale);
      this.enemies.push(enemy);
      scene.add(enemy.sprite);
    });
    this.total = this.enemies.length;
  }

  update(
    dt: number,
    player: { x: number; z: number },
    map: MapData,
    events: { onPlayerHit: (damage: number) => void; onAggro: () => void }
  ): void {
    for (const e of this.enemies) e.update(dt, player, map, events);

    // cheap pairwise separation so live enemies don't merge into one sprite
    for (let a = 0; a < this.enemies.length; a++) {
      const ea = this.enemies[a];
      if (!ea.alive) continue;
      for (let b = a + 1; b < this.enemies.length; b++) {
        const eb = this.enemies[b];
        if (!eb.alive) continue;
        const dx = eb.x - ea.x;
        const dz = eb.z - ea.z;
        const d = Math.hypot(dx, dz);
        const min = ea.radius + eb.radius;
        if (d > 0 && d < min) {
          const push = (min - d) / 2 / d;
          ea.x -= dx * push;
          ea.z -= dz * push;
          eb.x += dx * push;
          eb.z += dz * push;
        }
      }
    }
  }

  /** Gunfire is loud: wake every idle enemy within earshot (doom rules). */
  alert(player: { x: number; z: number }): void {
    const radius = 5 * this.scale;
    for (const e of this.enemies) {
      if (e.state === 'idle' && Math.hypot(player.x - e.x, player.z - e.z) < radius) {
        e.state = 'chase';
      }
    }
  }

  get aliveCount(): number {
    return this.enemies.filter((e) => e.alive).length;
  }

  liveSprites(): THREE.Sprite[] {
    return this.enemies.filter((e) => e.alive).map((e) => e.sprite);
  }

  /** @returns 'killed' | 'hit' | null */
  applyHit(sprite: THREE.Object3D, damage: number): 'killed' | 'hit' | null {
    const enemy = this.enemies.find((e) => e.sprite === sprite);
    if (!enemy || !enemy.alive) return null;
    const killed = enemy.damage(damage);
    if (killed) this.kills += 1;
    return killed ? 'killed' : 'hit';
  }

  dispose(scene: THREE.Scene): void {
    for (const e of this.enemies) {
      scene.remove(e.sprite);
      e.dispose();
    }
    this.enemies = [];
  }
}

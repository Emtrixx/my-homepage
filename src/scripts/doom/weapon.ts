import * as THREE from 'three';
import type { EnemyManager } from './enemies';

const FIRE_INTERVAL = 0.3; // s
const DAMAGE = 8;
const RANGE = 30000;
const START_AMMO = 75;

export class Weapon {
  ammo = START_AMMO;
  private cooldown = 0;
  private flashTime = 0;
  private raycaster = new THREE.Raycaster();

  constructor() {
    this.raycaster.far = RANGE;
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
  }

  get firing(): boolean {
    return this.flashTime > 0;
  }

  /** @returns what the shot did, so the caller can play the right feedback */
  fire(
    camera: THREE.Camera,
    enemies: EnemyManager,
    walls: THREE.Object3D
  ): 'empty' | 'cooling' | 'missed' | 'hit' | 'killed' {
    if (this.cooldown > 0) return 'cooling';
    if (this.ammo <= 0) return 'empty';

    this.ammo -= 1;
    this.cooldown = FIRE_INTERVAL;
    this.flashTime = 0.09;

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const wallHit = this.raycaster.intersectObject(walls, false)[0];
    const spriteHit = this.raycaster.intersectObjects(enemies.liveSprites(), false)[0];

    if (!spriteHit) return 'missed';
    if (wallHit && wallHit.distance < spriteHit.distance) return 'missed';

    return enemies.applyHit(spriteHit.object, DAMAGE) ?? 'missed';
  }
}

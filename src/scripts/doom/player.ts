import { collideCircle, type MapData } from './map';
import type { Input } from './input';

const ACCEL = 14; // 1/s, exponential smoothing
const LOOK = 0.0023; // rad per px of mouse travel
const MAX_PITCH = 1.15;

export class Player {
  x: number;
  z: number;
  yaw = 0; // 0 = facing -z (north, across the page)
  pitch = 0;
  health = 100;
  readonly radius: number;
  private readonly speed: number;
  private vx = 0;
  private vz = 0;
  /** horizontal speed as a fraction of max — drives the weapon bob */
  moveAmount = 0;

  /** scale = the scene unit (viewport height); speeds and radii follow it */
  constructor(x: number, z: number, scale: number) {
    this.x = x;
    this.z = z;
    this.speed = 1.7 * scale;
    this.radius = 0.09 * scale;
  }

  update(dt: number, input: Input, map: MapData): void {
    const look = input.consumeLook();
    this.yaw -= look.dx * LOOK;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch - look.dy * LOOK));

    const forward =
      (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) -
      (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
    const strafe =
      (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) -
      (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);

    // facing -z at yaw 0; right-hand basis on the xz plane
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);

    let wx = fx * forward + rx * strafe;
    let wz = fz * forward + rz * strafe;
    const len = Math.hypot(wx, wz);
    if (len > 1) {
      wx /= len;
      wz /= len;
    }

    const blend = 1 - Math.exp(-ACCEL * dt);
    this.vx += (wx * this.speed - this.vx) * blend;
    this.vz += (wz * this.speed - this.vz) * blend;

    const resolved = collideCircle(map, this.x + this.vx * dt, this.z + this.vz * dt, this.radius);
    this.x = resolved.x;
    this.z = resolved.z;
    this.moveAmount = Math.hypot(this.vx, this.vz) / this.speed;
  }
}

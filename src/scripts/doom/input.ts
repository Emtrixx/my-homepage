/* Pointer Lock + keyboard state. All listeners hang off one AbortController
   signal so teardown is a single abort() in index.ts. */
export class Input {
  private keys = new Set<string>();
  private dx = 0;
  private dy = 0;
  locked = false;

  constructor(
    private canvas: HTMLCanvasElement,
    signal: AbortSignal,
    handlers: {
      onLockChange: (locked: boolean) => void;
      onFire: () => void;
      onMute: () => void;
    }
  ) {
    document.addEventListener(
      'pointerlockchange',
      () => {
        this.locked = document.pointerLockElement === this.canvas;
        if (!this.locked) {
          this.keys.clear();
          this.dx = 0;
          this.dy = 0;
        }
        handlers.onLockChange(this.locked);
      },
      { signal }
    );

    document.addEventListener(
      'mousemove',
      (e) => {
        if (!this.locked) return;
        this.dx += e.movementX;
        this.dy += e.movementY;
      },
      { signal }
    );

    document.addEventListener(
      'mousedown',
      (e) => {
        if (this.locked && e.button === 0) handlers.onFire();
      },
      { signal }
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.locked) return;
        if (e.code === 'KeyM') {
          handlers.onMute();
          return;
        }
        this.keys.add(e.code);
        // keep space/arrows from scrolling anything underneath
        if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      },
      { signal }
    );

    document.addEventListener('keyup', (e) => this.keys.delete(e.code), { signal });
  }

  requestLock(): void {
    if (!this.locked) this.canvas.requestPointerLock();
  }

  down(code: string): boolean {
    return this.keys.has(code);
  }

  /** Accumulated mouse delta since the last call; consuming resets it. */
  consumeLook(): { dx: number; dy: number } {
    const d = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return d;
  }
}

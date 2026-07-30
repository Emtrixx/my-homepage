import { drawWeapon, WEAPON_W, WEAPON_H } from './textures';

/* DOM overlay: status bar, crosshair, weapon canvas, flashes, and the
   pause/death/win screens. Lives outside <body> (body is hidden during play),
   styled by an injected <style> element (style-src allows 'unsafe-inline').
   Same flat design language as the site: mono, edge borders, 2px radius. */

const CSS = `
.dhud-root {
  position: fixed; inset: 0; z-index: 60;
  pointer-events: none;
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--color-dust, #c2bcae);
}
.dhud-bar {
  position: absolute; left: 0; right: 0; bottom: 0; height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  background: rgba(21, 27, 46, 0.92);
  border-top: 1px solid #2b3350;
  font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
}
.dhud-bar b { color: #f2efe7; font-weight: 500; margin-left: 0.6em; }
.dhud-bar .dhud-low b { color: #dd6a4d; }
.dhud-hint { opacity: 0.55; font-size: 11px; }
.dhud-cross {
  position: absolute; left: 50%; top: 50%; width: 14px; height: 14px;
  transform: translate(-50%, -50%);
}
.dhud-cross::before, .dhud-cross::after {
  content: ''; position: absolute; background: #c2bcae; opacity: 0.85;
}
.dhud-cross::before { left: 6px; top: 0; width: 2px; height: 14px; }
.dhud-cross::after { left: 0; top: 6px; width: 14px; height: 2px; }
.dhud-weapon {
  position: absolute; left: 50%; bottom: 52px; transform: translateX(-50%);
  width: ${WEAPON_W * 4}px; height: ${WEAPON_H * 4}px;
  image-rendering: pixelated;
}
.dhud-flash { position: absolute; inset: 0; opacity: 0; }
.dhud-flash-damage {
  background: radial-gradient(circle at 50% 50%, rgba(196, 85, 58, 0.5), rgba(196, 85, 58, 0.15));
}
.dhud-flash-muzzle {
  background: radial-gradient(circle at 50% 72%, rgba(242, 239, 231, 0.22), transparent 45%);
}
.dhud-prompt {
  position: absolute; left: 50%; top: 58%; transform: translateX(-50%);
  font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase;
  color: #c2bcae;
}
.dhud-overlay {
  position: absolute; inset: 0; pointer-events: auto;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px;
  background: rgba(10, 14, 26, 0.84);
}
.dhud-overlay h2 {
  font-family: inherit; font-size: 14px; font-weight: 500;
  letter-spacing: 0.3em; text-transform: uppercase; color: #f2efe7;
}
.dhud-overlay p { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
.dhud-overlay .dhud-buttons { display: flex; gap: 12px; margin-top: 8px; }
.dhud-overlay button {
  font-family: inherit; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
  color: #f2efe7; background: #151b2e;
  border: 1px solid #2b3350; border-radius: 2px;
  padding: 10px 24px; cursor: pointer;
}
.dhud-overlay button:hover {
  border-color: #7fb0a3; color: #7fb0a3;
}
`;

export class Hud {
  readonly root: HTMLDivElement;
  private style: HTMLStyleElement;
  private healthEl: HTMLElement;
  private ammoEl: HTMLElement;
  private killsEl: HTMLElement;
  private healthWrap: HTMLElement;
  private weaponCtx: CanvasRenderingContext2D;
  private damageEl: HTMLDivElement;
  private muzzleEl: HTMLDivElement;
  private promptEl: HTMLDivElement;
  private overlayEl: HTMLDivElement | null = null;

  constructor(parent: HTMLElement) {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'dhud-root';
    this.root.style.display = 'none';

    this.damageEl = document.createElement('div');
    this.damageEl.className = 'dhud-flash dhud-flash-damage';
    this.muzzleEl = document.createElement('div');
    this.muzzleEl.className = 'dhud-flash dhud-flash-muzzle';
    this.root.append(this.damageEl, this.muzzleEl);

    const cross = document.createElement('div');
    cross.className = 'dhud-cross';
    this.root.appendChild(cross);

    const weapon = document.createElement('canvas');
    weapon.className = 'dhud-weapon';
    weapon.width = WEAPON_W;
    weapon.height = WEAPON_H;
    const ctx = weapon.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    this.weaponCtx = ctx;
    this.root.appendChild(weapon);

    const bar = document.createElement('div');
    bar.className = 'dhud-bar';
    this.healthWrap = document.createElement('span');
    this.healthWrap.innerHTML = 'Health<b>100</b>';
    const ammoWrap = document.createElement('span');
    ammoWrap.innerHTML = 'Ammo<b>75</b>';
    const killsWrap = document.createElement('span');
    killsWrap.innerHTML = 'Kills<b>0/0</b>';
    const hint = document.createElement('span');
    hint.className = 'dhud-hint';
    hint.textContent = 'wasd · mouse · m mute · esc';
    bar.append(this.healthWrap, ammoWrap, killsWrap, hint);
    this.healthEl = this.healthWrap.querySelector('b')!;
    this.ammoEl = ammoWrap.querySelector('b')!;
    this.killsEl = killsWrap.querySelector('b')!;
    this.root.appendChild(bar);

    this.promptEl = document.createElement('div');
    this.promptEl.className = 'dhud-prompt';
    this.promptEl.textContent = 'click to take aim';
    this.promptEl.style.display = 'none';
    this.root.appendChild(this.promptEl);

    parent.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = 'block';
  }

  setHealth(value: number): void {
    this.healthEl.textContent = String(Math.max(0, Math.round(value)));
    this.healthWrap.classList.toggle('dhud-low', value <= 30);
  }

  setAmmo(value: number): void {
    this.ammoEl.textContent = String(value);
  }

  setKills(done: number, total: number): void {
    this.killsEl.textContent = `${done}/${total}`;
  }

  drawWeapon(firing: boolean, bobX: number, bobY: number): void {
    drawWeapon(this.weaponCtx, firing, bobX, bobY);
  }

  damageFlash(): void {
    this.damageEl.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 320, easing: 'ease-out' });
  }

  muzzleFlash(): void {
    this.muzzleEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: 'ease-out' });
  }

  showPrompt(visible: boolean): void {
    if (visible) this.promptEl.textContent = 'click to take aim';
    this.promptEl.style.display = visible ? 'block' : 'none';
  }

  /** Briefly show a line of center-screen text (reuses the prompt element). */
  flashMessage(text: string, ms: number): void {
    this.promptEl.textContent = text;
    this.promptEl.style.display = 'block';
    window.setTimeout(() => {
      if (this.promptEl.textContent === text) this.promptEl.style.display = 'none';
    }, ms);
  }

  private overlay(
    title: string,
    sub: string | null,
    buttons: { label: string; onClick: () => void }[]
  ): void {
    this.hideOverlay();
    const el = document.createElement('div');
    el.className = 'dhud-overlay';
    const h = document.createElement('h2');
    h.textContent = title;
    el.appendChild(h);
    if (sub) {
      const p = document.createElement('p');
      p.textContent = sub;
      el.appendChild(p);
    }
    const row = document.createElement('div');
    row.className = 'dhud-buttons';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      row.appendChild(btn);
    }
    el.appendChild(row);
    this.root.appendChild(el);
    this.overlayEl = el;
  }

  showPause(onResume: () => void, onLeave: () => void): void {
    this.overlay('Paused', null, [
      { label: 'Resume', onClick: onResume },
      { label: 'Leave', onClick: onLeave },
    ]);
  }

  showDeath(onLeave: () => void): void {
    this.overlay('You died', 'the page keeps what it takes', [
      { label: 'Leave', onClick: onLeave },
    ]);
  }

  hideOverlay(): void {
    this.overlayEl?.remove();
    this.overlayEl = null;
  }

  destroy(): void {
    this.root.remove();
    this.style.remove();
  }
}

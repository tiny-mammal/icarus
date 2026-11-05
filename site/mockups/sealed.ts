/**
 * Sealed: text that decrypts itself, an entry you can lock and unlock, and a
 * lens that reads through the frosted app screenshot.
 */
import { reducedMotion } from './shared';

const CIPHER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const glyph = () => CIPHER[Math.floor(Math.random() * CIPHER.length)];

/**
 * Text that can be shown as ciphertext. Each letter becomes a span that keeps
 * its real character for layout and screen readers while a random glyph is
 * painted over it (see `.sl-c` in sealed.css).
 */
class Cipher {
  private readonly original: string;
  private chars: HTMLElement[] = [];
  private frame = 0;

  constructor(private readonly el: HTMLElement) {
    this.original = el.innerHTML;
  }

  /** Split every letter into its own span, all of them scrambled. */
  private wrap(): void {
    this.el.innerHTML = this.original;
    const walker = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    this.chars = [];
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const ch of node.data) {
        if (/\s/.test(ch)) {
          fragment.append(ch);
          continue;
        }
        const span = document.createElement('span');
        span.className = 'sl-c';
        span.textContent = ch;
        span.dataset.g = glyph();
        fragment.append(span);
        this.chars.push(span);
      }
      node.replaceWith(fragment);
    }
  }

  /**
   * Run the scramble: letters resolve (or, when `toCipher`, scramble) in a
   * wave from first to last over `duration` ms. `done` runs at the end.
   */
  private run(toCipher: boolean, duration: number, done?: () => void): void {
    cancelAnimationFrame(this.frame);
    const n = this.chars.length;
    const at = this.chars.map((_, i) => (i / n) * duration * 0.75 + Math.random() * duration * 0.25);
    const start = performance.now();
    let last = 0;
    const tick = (now: number) => {
      const t = now - start;
      const reshuffle = now - last > 45;
      if (reshuffle) last = now;
      let pending = false;
      this.chars.forEach((span, i) => {
        const flipped = t >= at[i];
        const scrambled = toCipher ? flipped : !flipped;
        if (!scrambled) {
          delete span.dataset.g;
        } else if (reshuffle || !span.dataset.g) {
          span.dataset.g = glyph();
        }
        if (!flipped) pending = true;
      });
      if (pending) this.frame = requestAnimationFrame(tick);
      else done?.();
    };
    this.frame = requestAnimationFrame(tick);
  }

  decrypt(duration: number, delay = 0): void {
    if (!this.chars.length) this.wrap();
    // Restore the untouched markup at the end, so kerning comes back.
    const finish = () => {
      this.el.innerHTML = this.original;
      this.chars = [];
    };
    window.setTimeout(() => this.run(false, duration, finish), delay);
  }

  encrypt(duration: number): void {
    this.wrap();
    this.chars.forEach((span) => delete span.dataset.g);
    this.run(true, duration);
  }
}

const motion = !reducedMotion();

// --- Headline -----------------------------------------------------------
const title = document.querySelector<HTMLElement>('[data-decrypt]');
if (title && motion) {
  new Cipher(title).decrypt(1400, 250);
}

// --- Lock / unlock the sample entry -------------------------------------
const entry = document.querySelector<HTMLElement>('[data-entry]');
const toggle = document.querySelector<HTMLButtonElement>('[data-toggle]');
if (entry && toggle) {
  const cipher = new Cipher(entry);
  const label = toggle.querySelector('[data-toggle-label]')!;
  let locked = false;
  toggle.addEventListener('click', () => {
    locked = !locked;
    toggle.setAttribute('aria-pressed', String(locked));
    label.textContent = locked ? 'Unlock' : 'Lock';
    if (locked) entry.setAttribute('aria-label', 'The entry, encrypted');
    else entry.removeAttribute('aria-label');
    if (locked) cipher.encrypt(motion ? 900 : 1);
    else cipher.decrypt(motion ? 1100 : 1);
  });
}

// --- Lens ---------------------------------------------------------------
const lens = document.querySelector<HTMLElement>('[data-lens] .screen');
const noise = document.querySelector<HTMLElement>('[data-noise]');
if (noise) {
  noise.textContent = Array.from({ length: 9000 }, glyph).join('');
}
if (lens) {
  const set = (x: number, y: number) => {
    lens.style.setProperty('--x', `${x}px`);
    lens.style.setProperty('--y', `${y}px`);
  };
  let lastPointer = -Infinity;
  lens.addEventListener('pointermove', (event) => {
    const rect = lens.getBoundingClientRect();
    set(event.clientX - rect.left, event.clientY - rect.top);
    lastPointer = performance.now();
  });

  // Until someone moves over it, the lens wanders over the open entry.
  if (motion) {
    let visible = false;
    new IntersectionObserver(([record]) => (visible = record.isIntersecting)).observe(lens);
    const drift = (now: number) => {
      if (visible && now - lastPointer > 2500) {
        const { width, height } = lens.getBoundingClientRect();
        const t = now / 1000;
        // The entry sits on the right of the desktop capture and fills the phone one.
        const [cx, ax, cy, ay] = width < 640 ? [0.5, 0.22, 0.55, 0.2] : [0.76, 0.1, 0.38, 0.12];
        set(width * (cx + ax * Math.sin(t * 0.5)), height * (cy + ay * Math.sin(t * 0.37 + 1)));
      }
      requestAnimationFrame(drift);
    };
    requestAnimationFrame(drift);
  }
}

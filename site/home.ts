/**
 * Landing page: the download button labels, the calendar that sits up as it
 * scrolls in, and the tour whose pinned screen follows the step being read.
 */
import './main';
import { onScrollProgress, reducedMotion, trackActiveStep } from './motion';

/** How far the calendar leans back before it scrolls in, in degrees. */
const LEAN = 26;

const tilt = document.querySelector<HTMLElement>('.home-tilt');
if (tilt) {
  if (reducedMotion()) {
    tilt.style.setProperty('--tilt', '0');
  } else {
    // Fully upright by the time a third of the screen has scrolled into view.
    onScrollProgress(tilt, (p) => {
      const t = Math.min(1, Math.max(0, (p - 0.08) / 0.3));
      const eased = 1 - (1 - t) ** 3;
      tilt.style.setProperty('--tilt', (LEAN * (1 - eased)).toFixed(2));
    });
  }
}

const shots = [...document.querySelectorAll<HTMLImageElement>('.home-frame [data-shot]')];
trackActiveStep([...document.querySelectorAll('.home-step')], (index) => {
  shots.forEach((shot, i) => shot.toggleAttribute('data-active', i === index));
});
